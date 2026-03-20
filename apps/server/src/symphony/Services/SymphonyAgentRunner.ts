/**
 * SymphonyAgentRunner - Service interface for running agent sessions for tasks.
 *
 * Renders prompt templates, starts provider sessions, and handles
 * agent lifecycle events (completion, failure, interruption).
 *
 * @module SymphonyAgentRunner
 */
import type {
  ProviderSession,
  ProviderRuntimeEvent,
  SymphonyRun,
  SymphonyRunId,
  SymphonyTask,
  SymphonyWorkflow,
  ThreadId,
} from "@t3tools/contracts";
import { ServiceMap } from "effect";
import type { Effect, Stream } from "effect";

import type { SymphonyError } from "../Errors.ts";
import type { ProjectionRepositoryError } from "../../persistence/Errors.ts";

/**
 * Input for starting a run.
 */
export interface StartRunInput {
  /** Task to run */
  readonly task: SymphonyTask;
  /** Workflow configuration */
  readonly workflow: SymphonyWorkflow;
  /** Project root path */
  readonly projectRoot: string;
  /** Workspace path for this task */
  readonly workspacePath: string;
  /** Run attempt number */
  readonly attempt: number;
}

/**
 * Result of starting a run.
 */
export interface StartRunResult {
  /** Created run record */
  readonly run: SymphonyRun;
  /** Provider session (if started) */
  readonly session: ProviderSession;
  /** Orchestration thread ID */
  readonly threadId: ThreadId;
}

/**
 * Prompt rendering context.
 */
export interface PromptContext {
  readonly task: SymphonyTask;
  readonly attempt: number;
  readonly workspacePath: string;
  readonly projectRoot: string;
}

/**
 * SymphonyAgentRunnerShape - Service API for agent execution.
 */
export interface SymphonyAgentRunnerShape {
  /**
   * Start a new run for a task.
   */
  readonly startRun: (
    input: StartRunInput,
  ) => Effect.Effect<StartRunResult, SymphonyError | ProjectionRepositoryError>;

  /**
   * Stop a running task.
   */
  readonly stopRun: (
    runId: SymphonyRunId,
  ) => Effect.Effect<void, SymphonyError | ProjectionRepositoryError>;

  /**
   * Get the event stream for a run.
   */
  readonly getRunEventStream: (
    runId: SymphonyRunId,
  ) => Stream.Stream<ProviderRuntimeEvent, ProjectionRepositoryError>;

  /**
   * Render a prompt template with context variables.
   */
  readonly renderPrompt: (template: string, context: PromptContext) => string;
}

/**
 * SymphonyAgentRunner - Service tag for agent execution.
 */
export class SymphonyAgentRunner extends ServiceMap.Service<
  SymphonyAgentRunner,
  SymphonyAgentRunnerShape
>()("t3/symphony/Services/SymphonyAgentRunner") {}
