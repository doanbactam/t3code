import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE symphony_tasks (
      id            TEXT PRIMARY KEY,
      project_id    TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      state         TEXT NOT NULL DEFAULT 'backlog',
      priority      TEXT NOT NULL DEFAULT 'medium',
      labels_json   TEXT NOT NULL DEFAULT '[]',
      workspace_key TEXT NOT NULL,
      current_run_id TEXT,
      run_count     INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    )
  `;

  yield* sql`
    CREATE INDEX idx_symphony_tasks_project_state
    ON symphony_tasks(project_id, state)
  `;

  yield* sql`
    CREATE INDEX idx_symphony_tasks_state_priority
    ON symphony_tasks(state, priority, created_at)
  `;
});
