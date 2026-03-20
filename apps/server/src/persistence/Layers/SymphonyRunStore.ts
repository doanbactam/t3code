import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";
import { Effect, Layer, Option, Schema, Struct } from "effect";

import { toPersistenceDecodeError, toPersistenceSqlError } from "../Errors.ts";

import {
  SymphonyRunRepository,
  type SymphonyRunRepositoryShape,
} from "../Services/SymphonyRunStore.ts";
import { SymphonyRun, SymphonyTokenUsage } from "@t3tools/contracts";

const SymphonyRunDbRowSchema = SymphonyRun.mapFields(
  Struct.assign({
    tokenUsage: Schema.NullOr(Schema.fromJsonString(SymphonyTokenUsage)),
  }),
);

function toPersistenceSqlOrDecodeError(sqlOperation: string, decodeOperation: string) {
  return (cause: unknown) =>
    Schema.isSchemaError(cause)
      ? toPersistenceDecodeError(decodeOperation)(cause)
      : toPersistenceSqlError(sqlOperation)(cause);
}

const SELECT_COLUMNS = `
  id,
  task_id AS "taskId",
  thread_id AS "threadId",
  attempt,
  status,
  prompt,
  error,
  token_usage_json AS "tokenUsage",
  started_at AS "startedAt",
  completed_at AS "completedAt"
`;

const makeSymphonyRunRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const insertRun = SqlSchema.void({
    Request: Schema.Struct({
      id: Schema.String,
      taskId: Schema.String,
      threadId: Schema.NullOr(Schema.String),
      attempt: Schema.Number,
      prompt: Schema.String,
      startedAt: Schema.String,
    }),
    execute: (row) =>
      sql`
        INSERT INTO symphony_runs (
          id, task_id, thread_id, attempt, status, prompt, started_at
        )
        VALUES (
          ${row.id}, ${row.taskId}, ${row.threadId}, ${row.attempt},
          'running', ${row.prompt}, ${row.startedAt}
        )
      `,
  });

  const findById = SqlSchema.findOneOption({
    Request: Schema.Struct({ runId: Schema.String }),
    Result: SymphonyRunDbRowSchema,
    execute: ({ runId }) =>
      sql.unsafe(`SELECT ${SELECT_COLUMNS} FROM symphony_runs WHERE id = '${runId}'`),
  });

  const findAllByTask = SqlSchema.findAll({
    Request: Schema.Struct({ taskId: Schema.String }),
    Result: SymphonyRunDbRowSchema,
    execute: ({ taskId }) =>
      sql.unsafe(
        `SELECT ${SELECT_COLUMNS} FROM symphony_runs WHERE task_id = '${taskId}' ORDER BY attempt ASC`,
      ),
  });

  const findActive = SqlSchema.findAll({
    Request: Schema.Void,
    Result: SymphonyRunDbRowSchema,
    execute: () =>
      sql.unsafe(
        `SELECT ${SELECT_COLUMNS} FROM symphony_runs WHERE status = 'running' ORDER BY started_at ASC`,
      ),
  });

  const findByThread = SqlSchema.findOneOption({
    Request: Schema.Struct({ threadId: Schema.String }),
    Result: SymphonyRunDbRowSchema,
    execute: ({ threadId }) =>
      sql.unsafe(`SELECT ${SELECT_COLUMNS} FROM symphony_runs WHERE thread_id = '${threadId}'`),
  });

  const create: SymphonyRunRepositoryShape["create"] = (input) =>
    insertRun({
      id: input.id as string,
      taskId: input.taskId as string,
      threadId: input.threadId as string | null,
      attempt: input.attempt,
      prompt: input.prompt,
      startedAt: input.startedAt,
    }).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "SymphonyRunRepository.create:query",
          "SymphonyRunRepository.create:encodeRequest",
        ),
      ),
    );

  const getById: SymphonyRunRepositoryShape["getById"] = (runId) =>
    findById({ runId: runId as string }).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "SymphonyRunRepository.getById:query",
          "SymphonyRunRepository.getById:decodeRow",
        ),
      ),
      Effect.flatMap((rowOption) =>
        Option.match(rowOption, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: (row) =>
            Effect.succeed(Option.some(row as Schema.Schema.Type<typeof SymphonyRun>)),
        }),
      ),
    );

  const complete: SymphonyRunRepositoryShape["complete"] = (input) =>
    sql
      .unsafe(
        `UPDATE symphony_runs SET status = ?, error = ?, token_usage_json = ?, completed_at = ? WHERE id = ?`,
        [
          input.status,
          input.error ?? null,
          input.tokenUsage ? JSON.stringify(input.tokenUsage) : null,
          input.completedAt,
          input.runId as string,
        ],
      )
      .pipe(
        Effect.asVoid,
        Effect.mapError(toPersistenceSqlError("SymphonyRunRepository.complete:query")),
      );

  const listByTask: SymphonyRunRepositoryShape["listByTask"] = (taskId) =>
    findAllByTask({ taskId: taskId as string }).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "SymphonyRunRepository.listByTask:query",
          "SymphonyRunRepository.listByTask:decodeRows",
        ),
      ),
      Effect.map((rows) => rows as ReadonlyArray<Schema.Schema.Type<typeof SymphonyRun>>),
    );

  const getActive: SymphonyRunRepositoryShape["getActive"] = () =>
    findActive().pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "SymphonyRunRepository.getActive:query",
          "SymphonyRunRepository.getActive:decodeRows",
        ),
      ),
      Effect.map((rows) => rows as ReadonlyArray<Schema.Schema.Type<typeof SymphonyRun>>),
    );

  const getByThreadId: SymphonyRunRepositoryShape["getByThreadId"] = (threadId) =>
    findByThread({ threadId: threadId as string }).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "SymphonyRunRepository.getByThreadId:query",
          "SymphonyRunRepository.getByThreadId:decodeRow",
        ),
      ),
      Effect.flatMap((rowOption) =>
        Option.match(rowOption, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: (row) =>
            Effect.succeed(Option.some(row as Schema.Schema.Type<typeof SymphonyRun>)),
        }),
      ),
    );

  return {
    create,
    getById,
    complete,
    listByTask,
    getActive,
    getByThreadId,
  } satisfies SymphonyRunRepositoryShape;
});

export const SymphonyRunRepositoryLive = Layer.effect(
  SymphonyRunRepository,
  makeSymphonyRunRepository,
);
