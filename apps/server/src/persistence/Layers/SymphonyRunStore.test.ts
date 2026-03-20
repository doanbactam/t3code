import { ProjectId, SymphonyRunId, SymphonyTaskId, ThreadId } from "@t3tools/contracts";
import { assert, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { SymphonyTaskRepository } from "../Services/SymphonyTaskStore.ts";
import { SymphonyTaskRepositoryLive } from "./SymphonyTaskStore.ts";
import { SymphonyRunRepository } from "../Services/SymphonyRunStore.ts";
import { SymphonyRunRepositoryLive } from "./SymphonyRunStore.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";

type RunStatus = "running" | "completed" | "failed" | "cancelled";

// Combined layer that provides both task and run repositories
const TestLayer = Layer.mergeAll(SymphonyTaskRepositoryLive, SymphonyRunRepositoryLive).pipe(
  Layer.provideMerge(SqlitePersistenceMemory),
);

const layer = it.layer(TestLayer);

// Helper to create a parent task for run tests
const createParentTask = (taskId: SymphonyTaskId, projectId: ProjectId) =>
  Effect.gen(function* () {
    const repository = yield* SymphonyTaskRepository;
    const now = "2026-03-20T10:00:00.000Z";
    yield* repository.create({
      id: taskId,
      projectId,
      title: "Parent Task",
      description: "",
      state: "backlog",
      priority: "medium",
      labels: [],
      workspaceKey: `task-${taskId}-ws`,
      createdAt: now,
      updatedAt: now,
    });
  });

layer("SymphonyRunRepository", (it) => {
  it.effect("creates and retrieves a run by id", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const runId = SymphonyRunId.makeUnsafe("run-001");
      const taskId = SymphonyTaskId.makeUnsafe("task-for-run-001");
      const projectId = ProjectId.makeUnsafe("project-001");
      const threadId = ThreadId.makeUnsafe("thread-001");
      const now = "2026-03-20T10:00:00.000Z";

      yield* createParentTask(taskId, projectId);

      yield* repository.create({
        id: runId,
        taskId,
        threadId,
        attempt: 1,
        prompt: "Fix the bug in auth module",
        startedAt: now,
      });

      const result = yield* repository.getById(runId);

      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        const run = result.value;
        assert.equal(run.id, runId);
        assert.equal(run.taskId, taskId);
        assert.equal(run.threadId, threadId);
        assert.equal(run.attempt, 1);
        assert.equal(run.status, "running");
        assert.equal(run.prompt, "Fix the bug in auth module");
        assert.isNull(run.error);
        assert.isNull(run.tokenUsage);
        assert.isNull(run.completedAt);
      }
    }),
  );

  it.effect("returns None for non-existent run", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const result = yield* repository.getById(SymphonyRunId.makeUnsafe("non-existent"));
      assert.isTrue(Option.isNone(result));
    }),
  );

  it.effect("creates run with null threadId", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const runId = SymphonyRunId.makeUnsafe("run-no-thread");
      const taskId = SymphonyTaskId.makeUnsafe("task-no-thread");
      const projectId = ProjectId.makeUnsafe("project-no-thread");
      const now = "2026-03-20T11:00:00.000Z";

      yield* createParentTask(taskId, projectId);

      yield* repository.create({
        id: runId,
        taskId,
        threadId: null,
        attempt: 1,
        prompt: "Task without thread",
        startedAt: now,
      });

      const result = yield* repository.getById(runId);
      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        assert.isNull(result.value.threadId);
      }
    }),
  );

  it.effect("completes a run with success", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const runId = SymphonyRunId.makeUnsafe("run-complete-success");
      const taskId = SymphonyTaskId.makeUnsafe("task-complete-success");
      const projectId = ProjectId.makeUnsafe("project-complete-success");
      const now = "2026-03-20T12:00:00.000Z";

      yield* createParentTask(taskId, projectId);

      yield* repository.create({
        id: runId,
        taskId,
        threadId: null,
        attempt: 1,
        prompt: "Complete this task",
        startedAt: now,
      });

      yield* repository.complete({
        runId,
        status: "completed" as RunStatus,
        tokenUsage: { prompt: 100, completion: 50, total: 150 },
        completedAt: "2026-03-20T12:30:00.000Z",
      });

      const result = yield* repository.getById(runId);
      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        const run = result.value;
        assert.equal(run.status, "completed");
        assert.isNull(run.error);
        assert.deepEqual(run.tokenUsage, { prompt: 100, completion: 50, total: 150 });
        assert.equal(run.completedAt, "2026-03-20T12:30:00.000Z");
      }
    }),
  );

  it.effect("completes a run with failure", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const runId = SymphonyRunId.makeUnsafe("run-complete-failed");
      const taskId = SymphonyTaskId.makeUnsafe("task-complete-failed");
      const projectId = ProjectId.makeUnsafe("project-complete-failed");
      const now = "2026-03-20T13:00:00.000Z";

      yield* createParentTask(taskId, projectId);

      yield* repository.create({
        id: runId,
        taskId,
        threadId: null,
        attempt: 1,
        prompt: "This will fail",
        startedAt: now,
      });

      yield* repository.complete({
        runId,
        status: "failed" as RunStatus,
        error: "Agent timeout exceeded",
        completedAt: "2026-03-20T13:10:00.000Z",
      });

      const result = yield* repository.getById(runId);
      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        const run = result.value;
        assert.equal(run.status, "failed");
        assert.equal(run.error, "Agent timeout exceeded");
        assert.isNull(run.tokenUsage);
      }
    }),
  );

  it.effect("lists runs by task ordered by attempt", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const taskId = SymphonyTaskId.makeUnsafe("task-list-runs");
      const projectId = ProjectId.makeUnsafe("project-list-runs");
      const baseTime = "2026-03-20T14:00:00.000Z";

      yield* createParentTask(taskId, projectId);

      yield* repository.create({
        id: SymphonyRunId.makeUnsafe("run-attempt-1"),
        taskId,
        threadId: null,
        attempt: 1,
        prompt: "First attempt",
        startedAt: baseTime,
      });

      yield* repository.complete({
        runId: SymphonyRunId.makeUnsafe("run-attempt-1"),
        status: "failed" as RunStatus,
        error: "Failed first try",
        completedAt: "2026-03-20T14:05:00.000Z",
      });

      yield* repository.create({
        id: SymphonyRunId.makeUnsafe("run-attempt-2"),
        taskId,
        threadId: null,
        attempt: 2,
        prompt: "Second attempt",
        startedAt: "2026-03-20T14:10:00.000Z",
      });

      const runs = yield* repository.listByTask(taskId);

      assert.equal(runs.length, 2);
      assert.equal(runs[0]?.attempt, 1);
      assert.equal(runs[0]?.status, "failed");
      assert.equal(runs[1]?.attempt, 2);
      assert.equal(runs[1]?.status, "running");
    }),
  );

  it.effect("gets active runs", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const baseTime = "2026-03-20T15:00:00.000Z";
      const runId = SymphonyRunId.makeUnsafe("run-active-unique-1");
      const completedRunId = SymphonyRunId.makeUnsafe("run-completed-unique-1");

      // Create parent tasks
      yield* createParentTask(
        SymphonyTaskId.makeUnsafe("task-active-unique-1"),
        ProjectId.makeUnsafe("project-active-unique-1"),
      );
      yield* createParentTask(
        SymphonyTaskId.makeUnsafe("task-completed-unique-1"),
        ProjectId.makeUnsafe("project-completed-unique-1"),
      );

      // Create running run
      yield* repository.create({
        id: runId,
        taskId: SymphonyTaskId.makeUnsafe("task-active-unique-1"),
        threadId: null,
        attempt: 1,
        prompt: "Active task",
        startedAt: baseTime,
      });

      // Create completed run
      yield* repository.create({
        id: completedRunId,
        taskId: SymphonyTaskId.makeUnsafe("task-completed-unique-1"),
        threadId: null,
        attempt: 1,
        prompt: "Completed task",
        startedAt: baseTime,
      });
      yield* repository.complete({
        runId: completedRunId,
        status: "completed" as RunStatus,
        completedAt: "2026-03-20T15:30:00.000Z",
      });

      const activeRuns = yield* repository.getActive();

      // Check that our active run is in the list
      const ourActiveRun = activeRuns.find((r) => r.id === runId);
      assert.isTrue(ourActiveRun !== undefined);
      assert.equal(ourActiveRun?.status, "running");

      // Check that the completed run is NOT in the list
      const completedRunInList = activeRuns.find((r) => r.id === completedRunId);
      assert.isTrue(completedRunInList === undefined);
    }),
  );

  it.effect("gets run by threadId", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const runId = SymphonyRunId.makeUnsafe("run-by-thread");
      const taskId = SymphonyTaskId.makeUnsafe("task-by-thread");
      const projectId = ProjectId.makeUnsafe("project-by-thread");
      const threadId = ThreadId.makeUnsafe("thread-for-run");
      const now = "2026-03-20T16:00:00.000Z";

      yield* createParentTask(taskId, projectId);

      yield* repository.create({
        id: runId,
        taskId,
        threadId,
        attempt: 1,
        prompt: "Run with thread",
        startedAt: now,
      });

      const result = yield* repository.getByThreadId(threadId);

      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        assert.equal(result.value.id, runId);
        assert.equal(result.value.threadId, threadId);
      }
    }),
  );

  it.effect("returns None for non-existent threadId", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const result = yield* repository.getByThreadId(ThreadId.makeUnsafe("non-existent-thread"));
      assert.isTrue(Option.isNone(result));
    }),
  );

  it.effect("cancels a running task", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyRunRepository;
      const runId = SymphonyRunId.makeUnsafe("run-cancel");
      const taskId = SymphonyTaskId.makeUnsafe("task-cancel");
      const projectId = ProjectId.makeUnsafe("project-cancel");
      const now = "2026-03-20T17:00:00.000Z";

      yield* createParentTask(taskId, projectId);

      yield* repository.create({
        id: runId,
        taskId,
        threadId: null,
        attempt: 1,
        prompt: "Will be cancelled",
        startedAt: now,
      });

      yield* repository.complete({
        runId,
        status: "cancelled" as RunStatus,
        completedAt: "2026-03-20T17:05:00.000Z",
      });

      const result = yield* repository.getById(runId);
      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        assert.equal(result.value.status, "cancelled");
      }
    }),
  );
});
