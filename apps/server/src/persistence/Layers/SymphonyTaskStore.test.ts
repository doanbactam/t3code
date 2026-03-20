import { ProjectId, SymphonyTaskId } from "@t3tools/contracts";
import { assert, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { SymphonyTaskRepository } from "../Services/SymphonyTaskStore.ts";
import { SymphonyTaskRepositoryLive } from "./SymphonyTaskStore.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";

type TaskState = "backlog" | "queued" | "running" | "review" | "done" | "failed";
type TaskPriority = "low" | "medium" | "high";

const layer = it.layer(
  SymphonyTaskRepositoryLive.pipe(Layer.provideMerge(SqlitePersistenceMemory)),
);

layer("SymphonyTaskRepository", (it) => {
  it.effect("creates and retrieves a task by id", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyTaskRepository;
      const taskId = SymphonyTaskId.makeUnsafe("task-001");
      const projectId = ProjectId.makeUnsafe("project-001");
      const now = "2026-03-20T10:00:00.000Z";

      yield* repository.create({
        id: taskId,
        projectId,
        title: "Test Task",
        description: "A test task description",
        state: "backlog" as TaskState,
        priority: "medium" as TaskPriority,
        labels: ["bug", "ui"],
        workspaceKey: "task-001-workspace",
        createdAt: now,
        updatedAt: now,
      });

      const result = yield* repository.getById(taskId);

      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        const task = result.value;
        assert.equal(task.id, taskId);
        assert.equal(task.projectId, projectId);
        assert.equal(task.title, "Test Task");
        assert.equal(task.description, "A test task description");
        assert.equal(task.state, "backlog");
        assert.equal(task.priority, "medium");
        assert.deepEqual(task.labels, ["bug", "ui"]);
        assert.equal(task.workspaceKey, "task-001-workspace");
        assert.isNull(task.currentRunId);
        assert.equal(task.runCount, 0);
      }
    }),
  );

  it.effect("returns None for non-existent task", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyTaskRepository;
      const result = yield* repository.getById(SymphonyTaskId.makeUnsafe("non-existent"));
      assert.isTrue(Option.isNone(result));
    }),
  );

  it.effect("lists tasks by project", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyTaskRepository;
      const projectId = ProjectId.makeUnsafe("project-list-test");
      const now = "2026-03-20T11:00:00.000Z";

      yield* repository.create({
        id: SymphonyTaskId.makeUnsafe("task-list-1"),
        projectId,
        title: "Task 1",
        description: "",
        state: "backlog" as TaskState,
        priority: "high" as TaskPriority,
        labels: [],
        workspaceKey: "task-list-1-ws",
        createdAt: now,
        updatedAt: now,
      });

      yield* repository.create({
        id: SymphonyTaskId.makeUnsafe("task-list-2"),
        projectId,
        title: "Task 2",
        description: "",
        state: "queued" as TaskState,
        priority: "low" as TaskPriority,
        labels: ["p2"],
        workspaceKey: "task-list-2-ws",
        createdAt: now,
        updatedAt: now,
      });

      const tasks = yield* repository.listByProject(projectId);
      assert.equal(tasks.length, 2);
      assert.equal(tasks[0]?.title, "Task 1");
      assert.equal(tasks[1]?.title, "Task 2");
    }),
  );

  it.effect("updates task fields", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyTaskRepository;
      const taskId = SymphonyTaskId.makeUnsafe("task-update-test");
      const projectId = ProjectId.makeUnsafe("project-update-test");
      const now = "2026-03-20T12:00:00.000Z";

      yield* repository.create({
        id: taskId,
        projectId,
        title: "Original Title",
        description: "Original description",
        state: "backlog" as TaskState,
        priority: "medium" as TaskPriority,
        labels: [],
        workspaceKey: "task-update-ws",
        createdAt: now,
        updatedAt: now,
      });

      yield* repository.update({
        taskId,
        title: "Updated Title",
        description: "Updated description",
        priority: "high" as TaskPriority,
        labels: ["urgent"],
        updatedAt: "2026-03-20T12:30:00.000Z",
      });

      const result = yield* repository.getById(taskId);
      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        const task = result.value;
        assert.equal(task.title, "Updated Title");
        assert.equal(task.description, "Updated description");
        assert.equal(task.priority, "high");
        assert.deepEqual(task.labels, ["urgent"]);
      }
    }),
  );

  it.effect("moves task state", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyTaskRepository;
      const taskId = SymphonyTaskId.makeUnsafe("task-move-test");
      const projectId = ProjectId.makeUnsafe("project-move-test");
      const now = "2026-03-20T13:00:00.000Z";

      yield* repository.create({
        id: taskId,
        projectId,
        title: "Task to Move",
        description: "",
        state: "backlog" as TaskState,
        priority: "medium" as TaskPriority,
        labels: [],
        workspaceKey: "task-move-ws",
        createdAt: now,
        updatedAt: now,
      });

      yield* repository.moveState({
        taskId,
        newState: "queued" as TaskState,
        updatedAt: "2026-03-20T13:30:00.000Z",
      });

      const result = yield* repository.getById(taskId);
      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        assert.equal(result.value.state, "queued");
      }
    }),
  );

  it.effect("moves task state with currentRunId", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyTaskRepository;
      const taskId = SymphonyTaskId.makeUnsafe("task-move-run");
      const projectId = ProjectId.makeUnsafe("project-move-run");
      const now = "2026-03-20T14:00:00.000Z";

      yield* repository.create({
        id: taskId,
        projectId,
        title: "Task with Run",
        description: "",
        state: "queued" as TaskState,
        priority: "medium" as TaskPriority,
        labels: [],
        workspaceKey: "task-move-run-ws",
        createdAt: now,
        updatedAt: now,
      });

      yield* repository.moveState({
        taskId,
        newState: "running" as TaskState,
        currentRunId: "run-001",
        updatedAt: "2026-03-20T14:30:00.000Z",
      });

      const result = yield* repository.getById(taskId);
      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        assert.equal(result.value.state, "running");
        assert.equal(result.value.currentRunId, "run-001");
      }
    }),
  );

  it.effect("increments run count", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyTaskRepository;
      const taskId = SymphonyTaskId.makeUnsafe("task-incr-run");
      const projectId = ProjectId.makeUnsafe("project-incr-run");
      const now = "2026-03-20T15:00:00.000Z";

      yield* repository.create({
        id: taskId,
        projectId,
        title: "Task for Run Count",
        description: "",
        state: "backlog" as TaskState,
        priority: "medium" as TaskPriority,
        labels: [],
        workspaceKey: "task-incr-run-ws",
        createdAt: now,
        updatedAt: now,
      });

      yield* repository.incrementRunCount(taskId, "2026-03-20T15:30:00.000Z");
      yield* repository.incrementRunCount(taskId, "2026-03-20T15:45:00.000Z");

      const result = yield* repository.getById(taskId);
      assert.isTrue(Option.isSome(result));
      if (Option.isSome(result)) {
        assert.equal(result.value.runCount, 2);
      }
    }),
  );

  it.effect("finds candidate tasks sorted by priority and age", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyTaskRepository;
      const projectId = ProjectId.makeUnsafe("project-candidates");
      const baseTime = "2026-03-20T16:00:00.000Z";

      // Create tasks with different priorities and states
      yield* repository.create({
        id: SymphonyTaskId.makeUnsafe("cand-backlog"),
        projectId,
        title: "Backlog Task",
        description: "",
        state: "backlog" as TaskState,
        priority: "high" as TaskPriority,
        labels: [],
        workspaceKey: "cand-backlog-ws",
        createdAt: baseTime,
        updatedAt: baseTime,
      });

      yield* repository.create({
        id: SymphonyTaskId.makeUnsafe("cand-high"),
        projectId,
        title: "High Priority",
        description: "",
        state: "queued" as TaskState,
        priority: "high" as TaskPriority,
        labels: [],
        workspaceKey: "cand-high-ws",
        createdAt: baseTime,
        updatedAt: baseTime,
      });

      yield* repository.create({
        id: SymphonyTaskId.makeUnsafe("cand-medium"),
        projectId,
        title: "Medium Priority",
        description: "",
        state: "queued" as TaskState,
        priority: "medium" as TaskPriority,
        labels: [],
        workspaceKey: "cand-medium-ws",
        createdAt: "2026-03-20T16:01:00.000Z",
        updatedAt: "2026-03-20T16:01:00.000Z",
      });

      yield* repository.create({
        id: SymphonyTaskId.makeUnsafe("cand-low"),
        projectId,
        title: "Low Priority",
        description: "",
        state: "queued" as TaskState,
        priority: "low" as TaskPriority,
        labels: [],
        workspaceKey: "cand-low-ws",
        createdAt: "2026-03-20T16:00:00.000Z",
        updatedAt: "2026-03-20T16:00:00.000Z",
      });

      const candidates = yield* repository.findCandidates({
        projectId,
        limit: 10,
      });

      // Should only return queued tasks, sorted by priority then age
      assert.equal(candidates.length, 3);
      assert.equal(candidates[0]?.title, "High Priority");
      assert.equal(candidates[1]?.title, "Medium Priority");
      assert.equal(candidates[2]?.title, "Low Priority");
    }),
  );

  it.effect("deletes a task", () =>
    Effect.gen(function* () {
      const repository = yield* SymphonyTaskRepository;
      const taskId = SymphonyTaskId.makeUnsafe("task-delete-test");
      const projectId = ProjectId.makeUnsafe("project-delete-test");
      const now = "2026-03-20T17:00:00.000Z";

      yield* repository.create({
        id: taskId,
        projectId,
        title: "Task to Delete",
        description: "",
        state: "backlog" as TaskState,
        priority: "medium" as TaskPriority,
        labels: [],
        workspaceKey: "task-delete-ws",
        createdAt: now,
        updatedAt: now,
      });

      yield* repository.deleteById(taskId);

      const result = yield* repository.getById(taskId);
      assert.isTrue(Option.isNone(result));
    }),
  );
});
