import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE symphony_runs (
      id            TEXT PRIMARY KEY,
      task_id       TEXT NOT NULL,
      thread_id     TEXT,
      attempt       INTEGER NOT NULL,
      status        TEXT NOT NULL DEFAULT 'running',
      prompt        TEXT NOT NULL,
      error         TEXT,
      token_usage_json TEXT,
      started_at    TEXT NOT NULL,
      completed_at  TEXT,
      FOREIGN KEY (task_id) REFERENCES symphony_tasks(id)
    )
  `;

  yield* sql`
    CREATE INDEX idx_symphony_runs_task
    ON symphony_runs(task_id)
  `;

  yield* sql`
    CREATE INDEX idx_symphony_runs_status
    ON symphony_runs(status)
  `;
});
