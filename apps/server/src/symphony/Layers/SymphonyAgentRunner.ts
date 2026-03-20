/**
 * SymphonyAgentRunner - Effect layer implementation.
 *
 * Runs agent sessions for Symphony tasks using ProviderService.
 *
 * @module symphony/Layers/SymphonyAgentRunner
 */
import {
  SymphonyRunId,
  ThreadId,
  type ProviderRuntimeEvent,
  type SymphonyRun,
  type SymphonyTask,
  type SymphonyWorkflow,
} from "@t3tools/contracts";
import { Effect, Layer, Option, Stream } from "effect";
import { randomUUID } from "node:crypto";

import { SymphonyAgentError } from "../Errors.ts";
import {
  SymphonyAgentRunner,
  type PromptContext,
  type StartRunInput,
  type StartRunResult,
} from "../Services/SymphonyAgentRunner.ts";
import { ProviderService } from "../../provider/Services/ProviderService.ts";
import { SymphonyRunRepository } from "../../persistence/Services/SymphonyRunStore.ts";
import { SymphonyTaskRepository } from "../../persistence/Services/SymphonyTaskStore.ts";

/**
 * Render a Mustache-style template with context variables.
 */
function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path: string) => {
    const parts = path.trim().split(".");
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return "";
      }
      if (typeof value === "object") {
        value = (value as Record<string, unknown>)[part];
      } else {
        return "";
      }
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  });
}

const makeSymphonyAgentRunner = Effect.gen(function* () {
  const providerService = yield* ProviderService;
  const runRepository = yield* SymphonyRunRepository;
  const taskRepository = yield* SymphonyTaskRepository;

  const renderPromptImpl = (template: string, context: PromptContext): string => {
    const contextVars: Record<string, unknown> = {
      task: {
        id: context.task.id,
        title: context.task.title,
        description: context.task.description,
        priority: context.task.priority,
        labels: context.task.labels.join(", "),
        state: context.task.state,
        workspaceKey: context.task.workspaceKey,
        runCount: context.task.runCount,
      },
      attempt: context.attempt,
      workspacePath: context.workspacePath,
      projectRoot: context.projectRoot,
    };

    return renderTemplate(template, contextVars);
  };

  const startRun = (input: StartRunInput) =>
    Effect.gen(function* () {
      const { task, workflow, workspacePath, attempt } = input;

      // Generate IDs
      const runId = SymphonyRunId.makeUnsafe(`run-${randomUUID()}`);
      const threadId = ThreadId.makeUnsafe(`symphony-${task.id}-${randomUUID().slice(0, 8)}`);
      const now = new Date().toISOString();

      // Render prompt
      const prompt = renderPromptImpl(workflow.promptTemplate, {
        task,
        attempt,
        workspacePath,
        projectRoot: input.projectRoot,
      });

      // Create run record
      yield* runRepository.create({
        id: runId,
        taskId: task.id,
        threadId,
        attempt,
        prompt,
        startedAt: now,
      });

      // Update task with current run
      yield* taskRepository.moveState({
        taskId: task.id,
        newState: "running",
        currentRunId: runId,
        updatedAt: now,
      });

      yield* taskRepository.incrementRunCount(task.id, now);

      // Start provider session
      const session = yield* providerService
        .startSession(threadId, {
          threadId,
          provider: "codex",
          cwd: workspacePath,
          runtimeMode: "full-access",
        })
        .pipe(
          Effect.mapError(
            (cause) =>
              new SymphonyAgentError({
                reason: "session_error",
                runId,
                taskId: task.id,
                cause,
              }),
          ),
        );

      // Send initial turn with the rendered prompt
      yield* providerService
        .sendTurn({
          threadId,
          input: prompt,
        })
        .pipe(
          Effect.mapError(
            (cause) =>
              new SymphonyAgentError({
                reason: "provider_error",
                runId,
                taskId: task.id,
                cause,
              }),
          ),
        );

      // Fetch the created run
      const runOption = yield* runRepository.getById(runId);
      const run = Option.getOrElse(
        runOption,
        () =>
          ({
            id: runId,
            taskId: task.id,
            threadId,
            attempt,
            status: "running" as const,
            prompt,
            error: null,
            tokenUsage: null,
            startedAt: now,
            completedAt: null,
          }) as SymphonyRun,
      );

      return {
        run,
        session,
        threadId,
      } satisfies StartRunResult;
    });

  const stopRun = (runId: SymphonyRunId) =>
    Effect.gen(function* () {
      const runOption = yield* runRepository.getById(runId);

      if (Option.isNone(runOption)) {
        return;
      }

      const run = runOption.value;

      if (run.threadId) {
        yield* providerService
          .stopSession({
            threadId: run.threadId,
          })
          .pipe(Effect.ignore);
      }

      // Mark run as cancelled
      const now = new Date().toISOString();
      yield* runRepository.complete({
        runId,
        status: "cancelled" as const,
        completedAt: now,
      });
    });

  const getRunEventStream = (runId: SymphonyRunId) =>
    Stream.fromEffect(runRepository.getById(runId)).pipe(
      Stream.flatMap((runOption) => {
        if (Option.isNone(runOption)) {
          return Stream.empty;
        }
        const run = runOption.value;
        if (!run.threadId) {
          return Stream.empty;
        }
        return providerService.streamEvents.pipe(
          Stream.filter((event) => event.threadId === run.threadId),
        );
      }),
    );

  return {
    startRun,
    stopRun,
    getRunEventStream,
    renderPrompt: renderPromptImpl,
  } satisfies typeof SymphonyAgentRunner.Service;
});

export const SymphonyAgentRunnerLive = Layer.effect(SymphonyAgentRunner, makeSymphonyAgentRunner);
