/**
 * Symphony Error Types
 *
 * Domain errors for the Symphony orchestration system.
 *
 * @module symphony/Errors
 */
import type { SymphonyRunId, SymphonyTaskId } from "@t3tools/contracts";
import { Data } from "effect";

/**
 * Base error type for Symphony operations.
 */
export type SymphonyError =
  | SymphonyWorkflowError
  | SymphonyWorkspaceError
  | SymphonyAgentError
  | SymphonyOrchestrationError;

/**
 * Workflow loading/parsing errors.
 */
export class SymphonyWorkflowError extends Data.TaggedError("SymphonyWorkflowError")<{
  readonly reason: "file_not_found" | "parse_error" | "invalid_config" | "watch_error";
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Workspace management errors.
 */
export class SymphonyWorkspaceError extends Data.TaggedError("SymphonyWorkspaceError")<{
  readonly reason:
    | "create_failed"
    | "not_found"
    | "hook_failed"
    | "cleanup_failed"
    | "permission_denied";
  readonly message: string;
  readonly taskId?: SymphonyTaskId;
  readonly cause?: unknown;
}> {}

/**
 * Agent runner errors.
 */
export class SymphonyAgentError extends Data.TaggedError("SymphonyAgentError")<{
  readonly reason:
    | "start_failed"
    | "render_failed"
    | "session_error"
    | "timeout"
    | "interrupted"
    | "provider_error";
  readonly message?: string;
  readonly runId?: SymphonyRunId;
  readonly taskId?: SymphonyTaskId;
  readonly cause?: unknown;
}> {}

/**
 * Orchestration errors.
 */
export class SymphonyOrchestrationError extends Data.TaggedError("SymphonyOrchestrationError")<{
  readonly reason:
    | "already_running"
    | "not_running"
    | "dispatch_failed"
    | "concurrency_exceeded"
    | "config_not_found";
  readonly message: string;
  readonly projectId?: string;
  readonly cause?: unknown;
}> {}
