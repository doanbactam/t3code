/**
 * SymphonyRunRepository - Persistence service for Symphony run attempts.
 *
 * Owns CRUD operations for symphony_runs table.
 *
 * @module SymphonyRunRepository
 */
import {
  IsoDateTime,
  SymphonyRun,
  SymphonyRunId,
  SymphonyRunStatus,
  SymphonyTaskId,
  SymphonyTokenUsage,
  ThreadId,
} from "@t3tools/contracts";
import { Option, Schema, ServiceMap } from "effect";
import type { Effect } from "effect";

import type { ProjectionRepositoryError } from "../Errors.ts";

export const CreateSymphonyRunInput = Schema.Struct({
  id: SymphonyRunId,
  taskId: SymphonyTaskId,
  threadId: Schema.NullOr(ThreadId),
  attempt: Schema.Number,
  prompt: Schema.String,
  startedAt: IsoDateTime,
  lastActivityAt: IsoDateTime,
});
export type CreateSymphonyRunInput = typeof CreateSymphonyRunInput.Type;

export const CompleteSymphonyRunInput = Schema.Struct({
  runId: SymphonyRunId,
  status: SymphonyRunStatus,
  error: Schema.optional(Schema.NullOr(Schema.String)),
  tokenUsage: Schema.optional(Schema.NullOr(SymphonyTokenUsage)),
  completedAt: IsoDateTime,
});
export type CompleteSymphonyRunInput = typeof CompleteSymphonyRunInput.Type;

export interface SymphonyRunRepositoryShape {
  readonly create: (
    input: CreateSymphonyRunInput,
  ) => Effect.Effect<void, ProjectionRepositoryError>;

  readonly getById: (
    runId: SymphonyRunId,
  ) => Effect.Effect<Option.Option<SymphonyRun>, ProjectionRepositoryError>;

  readonly complete: (
    input: CompleteSymphonyRunInput,
  ) => Effect.Effect<void, ProjectionRepositoryError>;

  readonly updateLastActivity: (
    runId: SymphonyRunId,
    lastActivityAt: IsoDateTime,
  ) => Effect.Effect<void, ProjectionRepositoryError>;

  readonly listByTask: (
    taskId: SymphonyTaskId,
  ) => Effect.Effect<ReadonlyArray<SymphonyRun>, ProjectionRepositoryError>;

  readonly getActive: () => Effect.Effect<ReadonlyArray<SymphonyRun>, ProjectionRepositoryError>;

  readonly getByThreadId: (
    threadId: ThreadId,
  ) => Effect.Effect<Option.Option<SymphonyRun>, ProjectionRepositoryError>;
}

export class SymphonyRunRepository extends ServiceMap.Service<
  SymphonyRunRepository,
  SymphonyRunRepositoryShape
>()("t3/persistence/Services/SymphonyRunStore/SymphonyRunRepository") {}
