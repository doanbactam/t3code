import { Schema } from "effect";
import {
  IsoDateTime,
  NonNegativeInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas";

// ── Entity IDs ───────────────────────────────────────────────────────

const makeEntityId = <Brand extends string>(brand: Brand) =>
  TrimmedNonEmptyString.pipe(Schema.brand(brand));

export const SymphonyTaskId = makeEntityId("SymphonyTaskId");
export type SymphonyTaskId = typeof SymphonyTaskId.Type;

export const SymphonyRunId = makeEntityId("SymphonyRunId");
export type SymphonyRunId = typeof SymphonyRunId.Type;

// ── Enums ────────────────────────────────────────────────────────────

export const SymphonyTaskState = Schema.Literals([
  "backlog",
  "queued",
  "running",
  "review",
  "done",
  "failed",
]);
export type SymphonyTaskState = typeof SymphonyTaskState.Type;

export const SymphonyTaskPriority = Schema.Literals(["low", "medium", "high"]);
export type SymphonyTaskPriority = typeof SymphonyTaskPriority.Type;

export const SymphonyRunStatus = Schema.Literals(["running", "completed", "failed", "cancelled"]);
export type SymphonyRunStatus = typeof SymphonyRunStatus.Type;

// ── Domain Entities ──────────────────────────────────────────────────

export const SymphonyTask = Schema.Struct({
  id: SymphonyTaskId,
  projectId: ProjectId,
  title: TrimmedNonEmptyString,
  description: Schema.String,
  state: SymphonyTaskState,
  priority: SymphonyTaskPriority,
  labels: Schema.Array(Schema.String),
  workspaceKey: TrimmedNonEmptyString,
  currentRunId: Schema.NullOr(SymphonyRunId),
  runCount: NonNegativeInt,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type SymphonyTask = typeof SymphonyTask.Type;

export const SymphonyTokenUsage = Schema.Struct({
  prompt: NonNegativeInt,
  completion: NonNegativeInt,
  total: NonNegativeInt,
});
export type SymphonyTokenUsage = typeof SymphonyTokenUsage.Type;

export const SymphonyRun = Schema.Struct({
  id: SymphonyRunId,
  taskId: SymphonyTaskId,
  threadId: Schema.NullOr(ThreadId),
  attempt: NonNegativeInt,
  status: SymphonyRunStatus,
  prompt: Schema.String,
  error: Schema.NullOr(Schema.String),
  tokenUsage: Schema.NullOr(SymphonyTokenUsage),
  startedAt: IsoDateTime,
  completedAt: Schema.NullOr(IsoDateTime),
});
export type SymphonyRun = typeof SymphonyRun.Type;

// ── Workflow Config ──────────────────────────────────────────────────

export const SymphonyWorkflowAgentConfig = Schema.Struct({
  maxConcurrency: Schema.optional(NonNegativeInt),
  maxRetries: Schema.optional(NonNegativeInt),
  maxRetryBackoffMs: Schema.optional(NonNegativeInt),
  turnTimeoutMs: Schema.optional(NonNegativeInt),
  stallTimeoutMs: Schema.optional(NonNegativeInt),
});
export type SymphonyWorkflowAgentConfig = typeof SymphonyWorkflowAgentConfig.Type;

export const SymphonyWorkflowHooksConfig = Schema.Struct({
  afterCreate: Schema.optional(Schema.String),
  beforeRun: Schema.optional(Schema.String),
  afterRun: Schema.optional(Schema.String),
  beforeRemove: Schema.optional(Schema.String),
  timeoutMs: Schema.optional(NonNegativeInt),
});
export type SymphonyWorkflowHooksConfig = typeof SymphonyWorkflowHooksConfig.Type;

export const SymphonyWorkflowConfig = Schema.Struct({
  agent: Schema.optional(SymphonyWorkflowAgentConfig),
  hooks: Schema.optional(SymphonyWorkflowHooksConfig),
});
export type SymphonyWorkflowConfig = typeof SymphonyWorkflowConfig.Type;

export const SymphonyWorkflow = Schema.Struct({
  config: SymphonyWorkflowConfig,
  promptTemplate: Schema.String,
});
export type SymphonyWorkflow = typeof SymphonyWorkflow.Type;

// ── WS Method & Channel Constants ────────────────────────────────────

export const SYMPHONY_WS_METHODS = {
  listTasks: "symphony.listTasks",
  createTask: "symphony.createTask",
  updateTask: "symphony.updateTask",
  deleteTask: "symphony.deleteTask",
  moveTask: "symphony.moveTask",
  retryTask: "symphony.retryTask",
  stopTask: "symphony.stopTask",
  getRunHistory: "symphony.getRunHistory",
  getWorkflow: "symphony.getWorkflow",
} as const;

export const SYMPHONY_WS_CHANNELS = {
  taskEvent: "symphony.taskEvent",
  runEvent: "symphony.runEvent",
} as const;

// ── Client Command Input Schemas ─────────────────────────────────────

export const SymphonyListTasksInput = Schema.Struct({
  projectId: ProjectId,
});
export type SymphonyListTasksInput = typeof SymphonyListTasksInput.Type;

export const SymphonyCreateTaskInput = Schema.Struct({
  projectId: ProjectId,
  title: TrimmedNonEmptyString,
  description: Schema.optional(Schema.String),
  priority: Schema.optional(SymphonyTaskPriority),
  labels: Schema.optional(Schema.Array(Schema.String)),
});
export type SymphonyCreateTaskInput = typeof SymphonyCreateTaskInput.Type;

export const SymphonyUpdateTaskInput = Schema.Struct({
  taskId: SymphonyTaskId,
  title: Schema.optional(TrimmedNonEmptyString),
  description: Schema.optional(Schema.String),
  priority: Schema.optional(SymphonyTaskPriority),
  labels: Schema.optional(Schema.Array(Schema.String)),
});
export type SymphonyUpdateTaskInput = typeof SymphonyUpdateTaskInput.Type;

export const SymphonyDeleteTaskInput = Schema.Struct({
  taskId: SymphonyTaskId,
});
export type SymphonyDeleteTaskInput = typeof SymphonyDeleteTaskInput.Type;

export const SymphonyMoveTaskInput = Schema.Struct({
  taskId: SymphonyTaskId,
  newState: SymphonyTaskState,
});
export type SymphonyMoveTaskInput = typeof SymphonyMoveTaskInput.Type;

export const SymphonyRetryTaskInput = Schema.Struct({
  taskId: SymphonyTaskId,
});
export type SymphonyRetryTaskInput = typeof SymphonyRetryTaskInput.Type;

export const SymphonyStopTaskInput = Schema.Struct({
  taskId: SymphonyTaskId,
});
export type SymphonyStopTaskInput = typeof SymphonyStopTaskInput.Type;

export const SymphonyGetRunHistoryInput = Schema.Struct({
  taskId: SymphonyTaskId,
});
export type SymphonyGetRunHistoryInput = typeof SymphonyGetRunHistoryInput.Type;

export const SymphonyGetWorkflowInput = Schema.Struct({
  projectId: ProjectId,
});
export type SymphonyGetWorkflowInput = typeof SymphonyGetWorkflowInput.Type;

// ── Push Event Payloads ──────────────────────────────────────────────

export const SymphonyTaskEventKind = Schema.Literals([
  "created",
  "updated",
  "deleted",
  "state-changed",
]);
export type SymphonyTaskEventKind = typeof SymphonyTaskEventKind.Type;

export const SymphonyTaskEventPayload = Schema.Struct({
  kind: SymphonyTaskEventKind,
  task: SymphonyTask,
});
export type SymphonyTaskEventPayload = typeof SymphonyTaskEventPayload.Type;

export const SymphonyRunEventKind = Schema.Literals([
  "started",
  "completed",
  "failed",
  "cancelled",
]);
export type SymphonyRunEventKind = typeof SymphonyRunEventKind.Type;

export const SymphonyRunEventPayload = Schema.Struct({
  kind: SymphonyRunEventKind,
  run: SymphonyRun,
  taskId: SymphonyTaskId,
});
export type SymphonyRunEventPayload = typeof SymphonyRunEventPayload.Type;

// ── RPC Schema Map ───────────────────────────────────────────────────

export const SymphonyRpcSchemas = {
  listTasks: {
    input: SymphonyListTasksInput,
    output: Schema.Array(SymphonyTask),
  },
  createTask: {
    input: SymphonyCreateTaskInput,
    output: SymphonyTask,
  },
  updateTask: {
    input: SymphonyUpdateTaskInput,
    output: SymphonyTask,
  },
  deleteTask: {
    input: SymphonyDeleteTaskInput,
    output: Schema.Void,
  },
  moveTask: {
    input: SymphonyMoveTaskInput,
    output: SymphonyTask,
  },
  retryTask: {
    input: SymphonyRetryTaskInput,
    output: SymphonyTask,
  },
  stopTask: {
    input: SymphonyStopTaskInput,
    output: SymphonyTask,
  },
  getRunHistory: {
    input: SymphonyGetRunHistoryInput,
    output: Schema.Array(SymphonyRun),
  },
  getWorkflow: {
    input: SymphonyGetWorkflowInput,
    output: SymphonyWorkflow,
  },
} as const;
