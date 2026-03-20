/**
 * SymphonyTaskRepository - Persistence service for Symphony tasks.
 *
 * Owns CRUD and state transition operations for symphony_tasks table.
 *
 * @module SymphonyTaskRepository
 */
import {
  IsoDateTime,
  ProjectId,
  SymphonyTask,
  SymphonyTaskId,
  SymphonyTaskPriority,
  SymphonyTaskState,
} from "@t3tools/contracts";
import { Option, Schema, ServiceMap } from "effect";
import type { Effect } from "effect";

import type { ProjectionRepositoryError } from "../Errors.ts";

export const CreateSymphonyTaskInput = Schema.Struct({
  id: SymphonyTaskId,
  projectId: ProjectId,
  title: Schema.String,
  description: Schema.String,
  state: SymphonyTaskState,
  priority: SymphonyTaskPriority,
  labels: Schema.Array(Schema.String),
  workspaceKey: Schema.String,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type CreateSymphonyTaskInput = typeof CreateSymphonyTaskInput.Type;

export const UpdateSymphonyTaskInput = Schema.Struct({
  taskId: SymphonyTaskId,
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  priority: Schema.optional(SymphonyTaskPriority),
  labels: Schema.optional(Schema.Array(Schema.String)),
  updatedAt: IsoDateTime,
});
export type UpdateSymphonyTaskInput = typeof UpdateSymphonyTaskInput.Type;

export const MoveTaskStateInput = Schema.Struct({
  taskId: SymphonyTaskId,
  newState: SymphonyTaskState,
  currentRunId: Schema.optional(Schema.NullOr(Schema.String)),
  updatedAt: IsoDateTime,
});
export type MoveTaskStateInput = typeof MoveTaskStateInput.Type;

export const FindCandidatesInput = Schema.Struct({
  projectId: ProjectId,
  limit: Schema.Number,
});
export type FindCandidatesInput = typeof FindCandidatesInput.Type;

export interface SymphonyTaskRepositoryShape {
  readonly create: (
    input: CreateSymphonyTaskInput,
  ) => Effect.Effect<void, ProjectionRepositoryError>;

  readonly getById: (
    taskId: SymphonyTaskId,
  ) => Effect.Effect<Option.Option<SymphonyTask>, ProjectionRepositoryError>;

  readonly listByProject: (
    projectId: ProjectId,
  ) => Effect.Effect<ReadonlyArray<SymphonyTask>, ProjectionRepositoryError>;

  readonly update: (
    input: UpdateSymphonyTaskInput,
  ) => Effect.Effect<void, ProjectionRepositoryError>;

  readonly deleteById: (taskId: SymphonyTaskId) => Effect.Effect<void, ProjectionRepositoryError>;

  readonly moveState: (input: MoveTaskStateInput) => Effect.Effect<void, ProjectionRepositoryError>;

  readonly incrementRunCount: (
    taskId: SymphonyTaskId,
    updatedAt: IsoDateTime,
  ) => Effect.Effect<void, ProjectionRepositoryError>;

  readonly findCandidates: (
    input: FindCandidatesInput,
  ) => Effect.Effect<ReadonlyArray<SymphonyTask>, ProjectionRepositoryError>;
}

export class SymphonyTaskRepository extends ServiceMap.Service<
  SymphonyTaskRepository,
  SymphonyTaskRepositoryShape
>()("t3/persistence/Services/SymphonyTaskStore/SymphonyTaskRepository") {}
