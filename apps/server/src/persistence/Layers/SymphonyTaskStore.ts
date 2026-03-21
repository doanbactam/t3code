import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";
import { Effect, Layer, Option, Schema, Struct } from "effect";

import { toPersistenceDecodeError, toPersistenceSqlError } from "../Errors.ts";

import {
  SymphonyTaskRepository,
  type SymphonyTaskRepositoryShape,
} from "../Services/SymphonyTaskStore.ts";
import { SymphonyTask } from "@t3tools/contracts";

const SymphonyTaskDbRowSchema = SymphonyTask.mapFields(
  Struct.assign({ labels: Schema.fromJsonString(Schema.Array(Schema.String)) }),
);

function toPersistenceSqlOrDecodeError(sqlOperation: string, decodeOperation: string) {
  return (cause: unknown) =>
    Schema.isSchemaError(cause)
      ? toPersistenceDecodeError(decodeOperation)(cause)
      : toPersistenceSqlError(sqlOperation)(cause);
}

const SELECT_COLUMNS = `
  id,
  project_id AS "projectId",
  title,
  description,
  state,
  priority,
  labels_json AS "labels",
  workspace_key AS "workspaceKey",
  current_run_id AS "currentRunId",
  run_count AS "runCount",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const makeSymphonyTaskRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const insertTask = SqlSchema.void({
    Request: Schema.Struct({
      id: Schema.String,
      projectId: Schema.String,
      title: Schema.String,
      description: Schema.String,
      state: Schema.String,
      priority: Schema.String,
      labelsJson: Schema.String,
      workspaceKey: Schema.String,
      createdAt: Schema.String,
      updatedAt: Schema.String,
    }),
    execute: (row) =>
      sql`
        INSERT INTO symphony_tasks (
          id, project_id, title, description, state, priority,
          labels_json, workspace_key, current_run_id, run_count,
          created_at, updated_at
        )
        VALUES (
          ${row.id}, ${row.projectId}, ${row.title}, ${row.description},
          ${row.state}, ${row.priority}, ${row.labelsJson}, ${row.workspaceKey},
          NULL, 0, ${row.createdAt}, ${row.updatedAt}
        )
      `,
  });

  const findById = SqlSchema.findOneOption({
    Request: Schema.Struct({ taskId: Schema.String }),
    Result: SymphonyTaskDbRowSchema,
    execute: ({ taskId }) =>
      sql`SELECT ${sql.unsafe(SELECT_COLUMNS)} FROM symphony_tasks WHERE id = ${taskId}`,
  });

  const findAllByProject = SqlSchema.findAll({
    Request: Schema.Struct({ projectId: Schema.String }),
    Result: SymphonyTaskDbRowSchema,
    execute: ({ projectId }) =>
      sql`SELECT ${sql.unsafe(SELECT_COLUMNS)} FROM symphony_tasks WHERE project_id = ${projectId} ORDER BY created_at ASC`,
  });

  const findCandidateRows = SqlSchema.findAll({
    Request: Schema.Struct({ projectId: Schema.String, limit: Schema.Number }),
    Result: SymphonyTaskDbRowSchema,
    execute: ({ projectId, limit }) =>
      sql`SELECT ${sql.unsafe(SELECT_COLUMNS)} FROM symphony_tasks WHERE project_id = ${projectId} AND state = 'queued' ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END ASC, created_at ASC LIMIT ${limit}`,
  });

  const create: SymphonyTaskRepositoryShape["create"] = (input) =>
    insertTask({
      id: input.id as string,
      projectId: input.projectId as string,
      title: input.title,
      description: input.description,
      state: input.state,
      priority: input.priority,
      labelsJson: JSON.stringify(input.labels),
      workspaceKey: input.workspaceKey,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    }).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "SymphonyTaskRepository.create:query",
          "SymphonyTaskRepository.create:encodeRequest",
        ),
      ),
    );

  const getById: SymphonyTaskRepositoryShape["getById"] = (taskId) =>
    findById({ taskId: taskId as string }).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "SymphonyTaskRepository.getById:query",
          "SymphonyTaskRepository.getById:decodeRow",
        ),
      ),
      Effect.flatMap((rowOption) =>
        Option.match(rowOption, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: (row) =>
            Effect.succeed(Option.some(row as Schema.Schema.Type<typeof SymphonyTask>)),
        }),
      ),
    );

  const listByProject: SymphonyTaskRepositoryShape["listByProject"] = (projectId) =>
    findAllByProject({ projectId: projectId as string }).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "SymphonyTaskRepository.listByProject:query",
          "SymphonyTaskRepository.listByProject:decodeRows",
        ),
      ),
      Effect.map((rows) => rows as ReadonlyArray<Schema.Schema.Type<typeof SymphonyTask>>),
    );

  const update: SymphonyTaskRepositoryShape["update"] = (input) =>
    Effect.gen(function* () {
      const sets: string[] = [];
      const values: unknown[] = [];

      if (input.title !== undefined) {
        sets.push("title = ?");
        values.push(input.title);
      }
      if (input.description !== undefined) {
        sets.push("description = ?");
        values.push(input.description);
      }
      if (input.priority !== undefined) {
        sets.push("priority = ?");
        values.push(input.priority);
      }
      if (input.labels !== undefined) {
        sets.push("labels_json = ?");
        values.push(JSON.stringify(input.labels));
      }
      sets.push("updated_at = ?");
      values.push(input.updatedAt);
      values.push(input.taskId as string);

      yield* sql.unsafe(`UPDATE symphony_tasks SET ${sets.join(", ")} WHERE id = ?`, values);
    }).pipe(Effect.mapError(toPersistenceSqlError("SymphonyTaskRepository.update:query")));

  const deleteById: SymphonyTaskRepositoryShape["deleteById"] = (taskId) =>
    sql`DELETE FROM symphony_tasks WHERE id = ${taskId}`.pipe(
      Effect.asVoid,
      Effect.mapError(toPersistenceSqlError("SymphonyTaskRepository.deleteById:query")),
    );

  const moveState: SymphonyTaskRepositoryShape["moveState"] = (input) =>
    Effect.gen(function* () {
      if (input.currentRunId !== undefined) {
        yield* sql.unsafe(
          `UPDATE symphony_tasks SET state = ?, current_run_id = ?, updated_at = ? WHERE id = ?`,
          [input.newState, input.currentRunId, input.updatedAt, input.taskId as string],
        );
      } else {
        yield* sql.unsafe(`UPDATE symphony_tasks SET state = ?, updated_at = ? WHERE id = ?`, [
          input.newState,
          input.updatedAt,
          input.taskId as string,
        ]);
      }
    }).pipe(Effect.mapError(toPersistenceSqlError("SymphonyTaskRepository.moveState:query")));

  const incrementRunCount: SymphonyTaskRepositoryShape["incrementRunCount"] = (taskId, updatedAt) =>
    sql
      .unsafe(`UPDATE symphony_tasks SET run_count = run_count + 1, updated_at = ? WHERE id = ?`, [
        updatedAt,
        taskId as string,
      ])
      .pipe(
        Effect.asVoid,
        Effect.mapError(toPersistenceSqlError("SymphonyTaskRepository.incrementRunCount:query")),
      );

  const findCandidates: SymphonyTaskRepositoryShape["findCandidates"] = (input) =>
    findCandidateRows({
      projectId: input.projectId as string,
      limit: input.limit,
    }).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "SymphonyTaskRepository.findCandidates:query",
          "SymphonyTaskRepository.findCandidates:decodeRows",
        ),
      ),
      Effect.map((rows) => rows as ReadonlyArray<Schema.Schema.Type<typeof SymphonyTask>>),
    );

  return {
    create,
    getById,
    listByProject,
    update,
    deleteById,
    moveState,
    incrementRunCount,
    findCandidates,
  } satisfies SymphonyTaskRepositoryShape;
});

export const SymphonyTaskRepositoryLive = Layer.effect(
  SymphonyTaskRepository,
  makeSymphonyTaskRepository,
);
