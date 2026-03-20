/**
 * SymphonyOrchestrator - Effect layer implementation.
 *
 * @module symphony/Layers/SymphonyOrchestrator
 */
import type { ProjectId, SymphonyRun } from "@t3tools/contracts";
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

const DEFAULTS = {
  maxConcurrency: 1,
  pollIntervalMs: 5000,
  stallTimeoutMs: 60000,
};

interface ProjectState {
  config: ProjectOrchestratorConfig;
  fiber: Fiber.Fiber<void, unknown>;
  activeRuns: Set<string>;
  retryQueue: RetryEntry[];
}

const makeSymphonyOrchestrator = Effect.gen(function* () {
  const taskRepository = yield* SymphonyTaskRepository;
  const runRepository = yield* SymphonyRunRepository;
  const workflowLoader = yield* SymphonyWorkflowLoader;
  const workspaceManager = yield* SymphonyWorkspaceManager;
  const agentRunner = yield* SymphonyAgentRunner;

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

      const activeRuns = yield* runRepository.getActive();
      const stalledRuns: SymphonyRun[] = [];

      for (const run of activeRuns) {
        const startedAt = new Date(run.startedAt).getTime();
        const now = Date.now();

        if (now - startedAt > stallTimeoutMs) {
          yield* runRepository.complete({
            runId: run.id,
            status: "failed",
            error: "Run stalled",
            completedAt: new Date().toISOString(),
          });
          stalledRuns.push(run);
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

      for (const entry of state.retryQueue) {
        if (entry.retryAt <= now) {
          readyToRetry.push(entry);
        } else {
          stillWaiting.push(entry);
        }
      }

      for (const entry of readyToRetry) {
        yield* taskRepository.moveState({
          taskId: entry.task.id,
          newState: "queued",
          updatedAt: new Date().toISOString(),
        });
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

      const candidates = yield* taskRepository.findCandidates({
        projectId,
        limit: slotsAvailable,
      });

      const workflowFile = yield* workflowLoader.load(projectId, config.projectRoot);

      for (const task of candidates) {
        const workspace = yield* workspaceManager.createWorkspace(task, config.projectRoot);

        const beforeRunHook = workflowFile.workflow.config.hooks?.beforeRun;
        if (beforeRunHook) {
          yield* workspaceManager.runHook(beforeRunHook, workspace.path, task);
        }

        const attempt = task.runCount + 1;
        const result = yield* agentRunner.startRun({
          task,
          workflow: workflowFile.workflow,
          projectRoot: config.projectRoot,
          workspacePath: workspace.path,
          attempt,
        });

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

      const fiber = yield* Effect.forkScoped(pollLoop(config.projectId));

      yield* Ref.update(projectStates, (states) => {
        return new Map(states).set(config.projectId, {
          config,
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
