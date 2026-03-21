/**
 * SymphonyOrchestrator - Effect layer implementation.
 *
 * Implements the task orchestration loop:
 * - Polls for queued tasks at configurable intervals
 * - Manages concurrency with configurable limits
 * - Detects stalled runs (exceeds stallTimeoutMs)
 * - Handles run completion and failure states
 * - Implements exponential backoff for retries
 * - Emits run lifecycle events (started, completed, failed)
 *
 * @module symphony/Layers/SymphonyOrchestrator
 */
import type { ProjectId, SymphonyRun, SymphonyTask } from "@t3tools/contracts";
import { Effect, Fiber, Layer, Ref } from "effect";

import { SymphonyOrchestrationError } from "../Errors.ts";
import {
  SymphonyOrchestrator,
  type OrchestratorStatus,
  type ProjectOrchestratorConfig,
  type RetryEntry,
} from "../Services/SymphonyOrchestrator.ts";
import { SymphonyTaskRepository } from "../../persistence/Services/SymphonyTaskStore.ts";
import { SymphonyRunRepository } from "../../persistence/Services/SymphonyRunStore.ts";
import { SymphonyWorkflowLoader } from "../Services/SymphonyWorkflowLoader.ts";
import { SymphonyWorkspaceManager } from "../Services/SymphonyWorkspaceManager.ts";
import { SymphonyAgentRunner } from "../Services/SymphonyAgentRunner.ts";
import { SymphonyPushService } from "../Services/SymphonyPushService.ts";

const DEFAULTS = {
  maxConcurrency: 1,
  pollIntervalMs: 5000,
  stallTimeoutMs: 60000,
  maxRetries: 3,
  maxRetryBackoffMs: 300000, // 5 minutes
};

interface ProjectState {
  config: ProjectOrchestratorConfig;
  fiber: Fiber.Fiber<void, unknown>;
  activeRuns: Set<string>;
  retryQueue: RetryEntry[];
}

/**
 * Calculate exponential backoff retry time.
 * Base: 1 second, doubles each attempt, capped at maxBackoffMs.
 */
const calculateRetryTime = (attempt: number, maxBackoffMs: number): number => {
  const backoffMs = Math.min(Math.pow(2, attempt) * 1000, maxBackoffMs);
  return Date.now() + backoffMs;
};

const makeSymphonyOrchestrator = Effect.gen(function* () {
  const taskRepository = yield* SymphonyTaskRepository;
  const runRepository = yield* SymphonyRunRepository;
  const workflowLoader = yield* SymphonyWorkflowLoader;
  const workspaceManager = yield* SymphonyWorkspaceManager;
  const agentRunner = yield* SymphonyAgentRunner;
  const pushService = yield* SymphonyPushService;

  const projectStates = yield* Ref.make<Map<string, ProjectState>>(new Map());

  const getStatus = (projectId: ProjectId) =>
    Effect.gen(function* () {
      const states = yield* Ref.get(projectStates);
      const state = states.get(projectId);

      if (!state) {
        return {
          isRunning: false,
          activeRunCount: 0,
          maxConcurrency: DEFAULTS.maxConcurrency,
          retryQueueSize: 0,
        } satisfies OrchestratorStatus;
      }

      return {
        isRunning: true,
        activeRunCount: state.activeRuns.size,
        maxConcurrency: state.config.maxConcurrency ?? DEFAULTS.maxConcurrency,
        retryQueueSize: state.retryQueue.length,
      } satisfies OrchestratorStatus;
    });

  const getActiveRuns = () => runRepository.getActive();

  /**
   * Recover from server restart by:
   * 1. Finding all running tasks
   * 2. Moving them back to queued state for retry
   * 3. Failing any active runs that were interrupted
   */
  const recoverFromRestart = () =>
    Effect.gen(function* () {
      const activeRuns = yield* runRepository.getActive();

      if (activeRuns.length === 0) {
        return { recoveredCount: 0 };
      }

      const now = new Date().toISOString();
      let recoveredCount = 0;

      for (const run of activeRuns) {
        // Mark the run as failed due to server restart
        yield* runRepository.complete({
          runId: run.id,
          status: "failed",
          error: "Server restart interrupted run",
          completedAt: now,
        });

        // Move the task back to queued state for retry
        yield* taskRepository.moveState({
          taskId: run.taskId,
          newState: "queued",
          updatedAt: now,
        });

        recoveredCount++;
      }

      return { recoveredCount };
    });

  const checkStalledRuns = (projectId: ProjectId) =>
    Effect.gen(function* () {
      const states = yield* Ref.get(projectStates);
      const state = states.get(projectId);
      const stallTimeoutMs = state?.config.stallTimeoutMs ?? DEFAULTS.stallTimeoutMs;
      const maxRetries = state?.config.maxRetries ?? DEFAULTS.maxRetries;
      const maxRetryBackoffMs = state?.config.maxRetryBackoffMs ?? DEFAULTS.maxRetryBackoffMs;

      const activeRuns = yield* runRepository.getActive();
      const stalledRuns: SymphonyRun[] = [];

      for (const run of activeRuns) {
        const lastActivityAt = new Date(run.lastActivityAt).getTime();
        const now = Date.now();

        if (now - lastActivityAt > stallTimeoutMs) {
          const completedAt = new Date().toISOString();
          yield* runRepository.complete({
            runId: run.id,
            status: "failed",
            error: "Run stalled - no progress detected",
            completedAt,
          });

          yield* pushService.emitRunEvent("failed", run, run.taskId);
          stalledRuns.push(run);

          // Get current task to check runCount
          const taskOption = yield* taskRepository.getById(run.taskId);
          if (taskOption._tag === "Some") {
            const task = taskOption.value;
            yield* taskRepository.incrementRunCount(run.taskId, completedAt);
            const nextRunCount = task.runCount + 1;

            // Only queue retry if under max retries
            if (nextRunCount < maxRetries) {
              const retryAt = calculateRetryTime(nextRunCount, maxRetryBackoffMs);
              yield* Ref.update(projectStates, (states) => {
                const currentState = states.get(projectId);
                if (!currentState) return states;

                return new Map(states).set(projectId, {
                  ...currentState,
                  retryQueue: [
                    ...currentState.retryQueue,
                    {
                      task: { id: run.taskId, runCount: nextRunCount },
                      retryAt,
                      attempt: nextRunCount,
                    },
                  ],
                });
              });
            } else {
              // Max retries exceeded - move task to failed state
              yield* taskRepository.moveState({
                taskId: run.taskId,
                newState: "failed",
                currentRunId: null,
                updatedAt: completedAt,
              });

              yield* pushService.emitTaskEvent("updated", {
                ...task,
                state: "failed",
              });
            }
          }
        }
      }

      return stalledRuns;
    });

  const processRetryQueue = (projectId: ProjectId) =>
    Effect.gen(function* () {
      const states = yield* Ref.get(projectStates);
      const state = states.get(projectId);

      if (!state) return;

      const now = Date.now();
      const readyToRetry: RetryEntry[] = [];
      const stillWaiting: RetryEntry[] = [];
      const processedTaskIds = new Set<string>();

      for (const entry of state.retryQueue) {
        // Skip duplicates - only process the first occurrence per task
        if (processedTaskIds.has(entry.task.id)) {
          continue;
        }

        if (entry.retryAt <= now) {
          readyToRetry.push(entry);
          processedTaskIds.add(entry.task.id);
        } else {
          stillWaiting.push(entry);
        }
      }

      const updatedAt = new Date().toISOString();

      for (const entry of readyToRetry) {
        yield* taskRepository.moveState({
          taskId: entry.task.id,
          newState: "queued",
          currentRunId: null,
          updatedAt,
        });

        // Emit task state change event
        const task = yield* taskRepository.getById(entry.task.id);
        if (task._tag === "Some") {
          yield* pushService.emitTaskEvent("updated", task.value);
        }
      }

      yield* Ref.update(projectStates, (states) => {
        const currentState = states.get(projectId);
        if (!currentState) return states;

        return new Map(states).set(projectId, {
          ...currentState,
          retryQueue: stillWaiting,
        });
      });
    });

  /**
   * Monitor a single run for completion/timeout.
   * Handles run result and moves task to retry or done state.
   */
  const monitorRun = (projectId: ProjectId, runId: string, task: SymphonyTask) =>
    Effect.gen(function* () {
      const states = yield* Ref.get(projectStates);
      const state = states.get(projectId);
      if (!state) return;

      const config = state.config;
      const turnTimeoutMs = config.turnTimeoutMs ?? 300000; // 5 minutes default
      const maxRetries = config.maxRetries ?? DEFAULTS.maxRetries;
      const maxRetryBackoffMs = config.maxRetryBackoffMs ?? DEFAULTS.maxRetryBackoffMs;
      const pollIntervalMs = 1000; // Poll every 1 second

      // Poll for run completion with timeout
      const startedAt = Date.now();
      let run = yield* runRepository.getById(runId);

      while (run._tag === "Some" && run.value.status === "running") {
        const elapsedMs = Date.now() - startedAt;

        // Timeout check
        if (elapsedMs > turnTimeoutMs) {
          const now = new Date().toISOString();
          yield* runRepository.complete({
            runId,
            status: "failed",
            error: `Run exceeded timeout of ${turnTimeoutMs}ms`,
            completedAt: now,
          });

          // Re-fetch run to get updated state with completedAt
          const updatedRun = yield* runRepository.getById(runId);
          if (updatedRun._tag === "Some") {
            yield* pushService.emitRunEvent("failed", updatedRun.value, task.id);
          }

          // Increment run count for retry
          yield* taskRepository.incrementRunCount(task.id, now);
          const nextRunCount = task.runCount + 1;

          if (nextRunCount < maxRetries) {
            const retryAt = calculateRetryTime(nextRunCount, maxRetryBackoffMs);
            yield* Ref.update(projectStates, (states) => {
              const currentState = states.get(projectId);
              if (!currentState) return states;

              const newActiveRuns = new Set(currentState.activeRuns);
              newActiveRuns.delete(runId);

              return new Map(states).set(projectId, {
                ...currentState,
                activeRuns: newActiveRuns,
                retryQueue: [
                  ...currentState.retryQueue,
                  {
                    task: { id: task.id, runCount: nextRunCount },
                    retryAt,
                    attempt: nextRunCount,
                  },
                ],
              });
            });
          } else {
            // Max retries exceeded
            yield* taskRepository.moveState({
              taskId: task.id,
              newState: "failed",
              currentRunId: runId,
              updatedAt: now,
            });

            yield* pushService.emitTaskEvent("updated", {
              ...task,
              state: "failed",
            });

            yield* Ref.update(projectStates, (states) => {
              const currentState = states.get(projectId);
              if (!currentState) return states;

              const newActiveRuns = new Set(currentState.activeRuns);
              newActiveRuns.delete(runId);

              return new Map(states).set(projectId, {
                ...currentState,
                activeRuns: newActiveRuns,
              });
            });
          }
          return;
        }

        // Poll again
        yield* Effect.sleep(pollIntervalMs);
        run = yield* runRepository.getById(runId);
      }

      // Run completed
      if (run._tag === "Some") {
        const finalRun = run.value;
        const now = new Date().toISOString();

        if (finalRun.status === "completed") {
          yield* taskRepository.moveState({
            taskId: task.id,
            newState: "done",
            currentRunId: runId,
            updatedAt: now,
          });

          yield* pushService.emitTaskEvent("updated", {
            ...task,
            state: "done",
          });

          yield* pushService.emitRunEvent("completed", finalRun, task.id);
        } else if (finalRun.status === "failed") {
          yield* taskRepository.incrementRunCount(task.id, now);
          const nextRunCount = task.runCount + 1;

          if (nextRunCount < maxRetries) {
            const retryAt = calculateRetryTime(nextRunCount, maxRetryBackoffMs);
            yield* Ref.update(projectStates, (states) => {
              const currentState = states.get(projectId);
              if (!currentState) return states;

              const newActiveRuns = new Set(currentState.activeRuns);
              newActiveRuns.delete(runId);

              return new Map(states).set(projectId, {
                ...currentState,
                activeRuns: newActiveRuns,
                retryQueue: [
                  ...currentState.retryQueue,
                  {
                    task: { id: task.id, runCount: nextRunCount },
                    retryAt,
                    attempt: nextRunCount,
                  },
                ],
              });
            });

            yield* pushService.emitRunEvent("failed", finalRun, task.id);
          } else {
            // Max retries exceeded
            yield* taskRepository.moveState({
              taskId: task.id,
              newState: "failed",
              currentRunId: runId,
              updatedAt: now,
            });

            yield* pushService.emitTaskEvent("updated", {
              ...task,
              state: "failed",
            });

            yield* pushService.emitRunEvent("failed", finalRun, task.id);

            yield* Ref.update(projectStates, (states) => {
              const currentState = states.get(projectId);
              if (!currentState) return states;

              const newActiveRuns = new Set(currentState.activeRuns);
              newActiveRuns.delete(runId);

              return new Map(states).set(projectId, {
                ...currentState,
                activeRuns: newActiveRuns,
              });
            });
          }
        }
      } else {
        // Run disappeared - mark as failed
        const now = new Date().toISOString();
        yield* taskRepository.incrementRunCount(task.id, now);

        const retryAt = calculateRetryTime(task.runCount, maxRetryBackoffMs);
        yield* Ref.update(projectStates, (states) => {
          const currentState = states.get(projectId);
          if (!currentState) return states;

          const newActiveRuns = new Set(currentState.activeRuns);
          newActiveRuns.delete(runId);

          return new Map(states).set(projectId, {
            ...currentState,
            activeRuns: newActiveRuns,
            retryQueue: [
              ...currentState.retryQueue,
              {
                task: { id: task.id, runCount: task.runCount + 1 },
                retryAt,
                attempt: task.runCount + 1,
              },
            ],
          });
        });
      }
    });

  const tick = (projectId: ProjectId) =>
    Effect.gen(function* () {
      const states = yield* Ref.get(projectStates);
      const state = states.get(projectId);

      if (!state) return;

      const { config, activeRuns } = state;
      const maxConcurrency = config.maxConcurrency ?? DEFAULTS.maxConcurrency;

      yield* checkStalledRuns(projectId);
      yield* processRetryQueue(projectId);

      if (activeRuns.size >= maxConcurrency) return;

      const slotsAvailable = maxConcurrency - activeRuns.size;

      const candidates = yield* taskRepository
        .findCandidates({
          projectId,
          limit: slotsAvailable,
        })
        .pipe(
          Effect.catch((error: unknown) =>
            Effect.logWarning(`Failed to find candidates: ${String(error)}`).pipe(
              Effect.andThen(() => Effect.succeed([] as SymphonyTask[])),
            ),
          ),
        );

      if (candidates.length === 0) return;

      const workflowFile = yield* workflowLoader
        .load(projectId, config.projectRoot)
        .pipe(
          Effect.catch((error: unknown) =>
            Effect.logWarning(`Failed to load workflow: ${String(error)}`).pipe(
              Effect.andThen(() => Effect.succeed(null)),
            ),
          ),
        );

      if (!workflowFile) return;

      for (const task of candidates) {
        const workspace = yield* workspaceManager
          .createWorkspace(task, config.projectRoot)
          .pipe(
            Effect.catch((error: unknown) =>
              Effect.logWarning(
                `Failed to create workspace for task ${task.id}: ${String(error)}`,
              ).pipe(Effect.andThen(() => Effect.succeed(null))),
            ),
          );

        if (!workspace) continue;

        const beforeRunHook = workflowFile.workflow.config.hooks?.beforeRun;
        if (beforeRunHook) {
          yield* workspaceManager
            .runHook(beforeRunHook, workspace.path, task)
            .pipe(
              Effect.catch((error: unknown) =>
                Effect.logWarning(`Hook failed for task ${task.id}: ${String(error)}`).pipe(
                  Effect.andThen(() => Effect.void),
                ),
              ),
            );
        }

        const attempt = task.runCount + 1;
        const result = yield* agentRunner
          .startRun({
            task,
            workflow: workflowFile.workflow,
            projectRoot: config.projectRoot,
            workspacePath: workspace.path,
            attempt,
          })
          .pipe(
            Effect.catch((error: unknown) =>
              Effect.logWarning(`Failed to start run for task ${task.id}: ${String(error)}`).pipe(
                Effect.andThen(() => Effect.succeed(null)),
              ),
            ),
          );

        if (!result) continue;

        yield* Ref.update(projectStates, (states) => {
          const currentState = states.get(projectId);
          if (!currentState) return states;

          const newActiveRuns = new Set(currentState.activeRuns);
          newActiveRuns.add(result.run.id);

          return new Map(states).set(projectId, {
            ...currentState,
            activeRuns: newActiveRuns,
          });
        });

        yield* pushService.emitRunEvent("started", result.run, task.id);

        // Monitor run in background (non-blocking)
        // Ensure activeRuns is cleaned up even if monitoring fails
        yield* monitorRun(projectId, result.run.id, task).pipe(
          Effect.tapError((error: unknown) =>
            Effect.logError(`Run monitoring failed for task ${task.id}: ${String(error)}`).pipe(
              Effect.andThen(() =>
                Ref.update(projectStates, (states) => {
                  const currentState = states.get(projectId);
                  if (!currentState) return states;
                  const newActiveRuns = new Set(currentState.activeRuns);
                  newActiveRuns.delete(result.run.id);
                  return new Map(states).set(projectId, {
                    ...currentState,
                    activeRuns: newActiveRuns,
                  });
                }),
              ),
            ),
          ),
          Effect.forkScoped,
          Effect.andThen(() => Effect.void),
        );
      }
    });

  const pollLoop = (projectId: ProjectId) =>
    Effect.forever(
      Effect.gen(function* () {
        yield* tick(projectId);
        yield* Effect.sleep(DEFAULTS.pollIntervalMs);
      }),
    );

  const start = (config: ProjectOrchestratorConfig) =>
    Effect.gen(function* () {
      const states = yield* Ref.get(projectStates);

      if (states.has(config.projectId)) {
        return yield* new SymphonyOrchestrationError({
          reason: "already_running",
          message: `Orchestrator already running for project ${config.projectId}`,
          projectId: config.projectId,
        });
      }

      // Normalize config with defaults
      const normalizedConfig: ProjectOrchestratorConfig = {
        ...config,
        maxConcurrency: config.maxConcurrency ?? DEFAULTS.maxConcurrency,
        maxRetries: config.maxRetries ?? DEFAULTS.maxRetries,
        maxRetryBackoffMs: config.maxRetryBackoffMs ?? DEFAULTS.maxRetryBackoffMs,
        turnTimeoutMs: config.turnTimeoutMs ?? 300000, // 5 minutes default
        stallTimeoutMs: config.stallTimeoutMs ?? DEFAULTS.stallTimeoutMs,
      };

      const fiber = yield* Effect.forkScoped(pollLoop(config.projectId));

      yield* Ref.update(projectStates, (states) => {
        return new Map(states).set(config.projectId, {
          config: normalizedConfig,
          fiber,
          activeRuns: new Set(),
          retryQueue: [],
        });
      });
    });

  const stop = (projectId: ProjectId) =>
    Effect.gen(function* () {
      const states = yield* Ref.get(projectStates);
      const state = states.get(projectId);

      if (!state) return;

      yield* Fiber.interrupt(state.fiber);

      yield* Ref.update(projectStates, (states) => {
        const newStates = new Map(states);
        newStates.delete(projectId);
        return newStates;
      });
    });

  return {
    start,
    stop,
    getStatus,
    getActiveRuns,
    tick,
    checkStalledRuns,
    processRetryQueue,
    recoverFromRestart,
  } satisfies typeof SymphonyOrchestrator.Service;
});

export const SymphonyOrchestratorLive = Layer.effect(
  SymphonyOrchestrator,
  makeSymphonyOrchestrator,
);
