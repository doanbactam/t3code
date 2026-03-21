import "../index.css";

import type {
  NativeApi,
  ProjectId,
  SymphonyOrchestratorStatus,
  SymphonyRun,
  SymphonyRunId,
  SymphonyRunEventPayload,
  SymphonyTask,
  SymphonyTaskEventPayload,
  SymphonyTaskId,
  SymphonyWorkflow,
} from "@t3tools/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { resetCachedNativeApiForTests } from "../nativeApi";
import { useSymphonyStore } from "../symphonyStore";
import { useStore } from "../store";
import { SymphonyDashboard } from "./symphony";

const PROJECT_ID = "project-symphony-browser" as ProjectId;
const TASK_ID = "task-symphony-1" as SymphonyTaskId;
const NOW_ISO = "2026-03-21T07:00:00.000Z";

function createTask(overrides: Partial<SymphonyTask> = {}): SymphonyTask {
  return {
    id: TASK_ID,
    projectId: PROJECT_ID,
    title: "Ship Symphony run events",
    description: "Wire run history updates through the dashboard.",
    state: "backlog",
    priority: "high",
    labels: ["symphony", "backend", "realtime"],
    workspaceKey: "symphony-run-events",
    currentRunId: null,
    runCount: 0,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

function createRun(overrides: Partial<SymphonyRun> = {}): SymphonyRun {
  return {
    id: "run-symphony-1" as SymphonyRunId,
    taskId: TASK_ID,
    threadId: null,
    attempt: 1,
    status: "running",
    prompt: "Implement the Symphony push service.",
    error: null,
    tokenUsage: null,
    startedAt: NOW_ISO,
    lastActivityAt: NOW_ISO,
    completedAt: null,
    ...overrides,
  };
}

function createWorkflow(): SymphonyWorkflow {
  return {
    config: {
      agent: {
        maxConcurrency: 3,
        maxRetries: 2,
        turnTimeoutMs: 90_000,
        stallTimeoutMs: 60_000,
      },
    },
    promptTemplate: "Complete the selected Symphony task.",
  };
}

function createOrchestratorStatus(
  overrides: Partial<SymphonyOrchestratorStatus> = {},
): SymphonyOrchestratorStatus {
  return {
    isRunning: false,
    activeRunCount: 0,
    maxConcurrency: 3,
    retryQueueSize: 0,
    ...overrides,
  };
}

function installMockNativeApi(options: {
  tasks?: SymphonyTask[];
  runsByTaskId?: Record<string, SymphonyRun[]>;
  workflow?: SymphonyWorkflow;
  status?: SymphonyOrchestratorStatus;
}) {
  const taskEventListeners = new Set<(event: SymphonyTaskEventPayload) => void>();
  const runEventListeners = new Set<(event: SymphonyRunEventPayload) => void>();
  let status = options.status ?? createOrchestratorStatus();

  const api = {
    symphony: {
      listTasks: vi.fn(async () => ({ tasks: options.tasks ?? [] })),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      moveTask: vi.fn(),
      retryTask: vi.fn(),
      stopTask: vi.fn(),
      getRunHistory: vi.fn(async (taskId: SymphonyTaskId) => ({
        runs: options.runsByTaskId?.[taskId] ?? [],
      })),
      getWorkflow: vi.fn(async () => ({ workflow: options.workflow ?? createWorkflow() })),
      startOrchestrator: vi.fn(async () => {
        status = { ...status, isRunning: true };
      }),
      stopOrchestrator: vi.fn(async () => {
        status = { ...status, isRunning: false, activeRunCount: 0 };
      }),
      getOrchestratorStatus: vi.fn(async () => ({ status })),
      onTaskEvent: vi.fn((callback: (event: SymphonyTaskEventPayload) => void) => {
        taskEventListeners.add(callback);
        return () => taskEventListeners.delete(callback);
      }),
      onRunEvent: vi.fn((callback: (event: SymphonyRunEventPayload) => void) => {
        runEventListeners.add(callback);
        return () => runEventListeners.delete(callback);
      }),
    },
  } as unknown as NativeApi;

  window.nativeApi = api;
  resetCachedNativeApiForTests();

  return {
    api,
    emitTaskEvent: (event: SymphonyTaskEventPayload) => {
      for (const listener of taskEventListeners) {
        listener(event);
      }
    },
    emitRunEvent: (event: SymphonyRunEventPayload) => {
      for (const listener of runEventListeners) {
        listener(event);
      }
    },
  };
}

describe("SymphonyDashboard browser", () => {
  beforeEach(() => {
    useSymphonyStore.getState().reset();
    useStore.setState({
      projects: [
        {
          id: PROJECT_ID,
          name: "Symphony Project",
          cwd: "/repo/symphony",
          model: "gpt-5",
          expanded: true,
          scripts: [],
        },
      ],
      threads: [],
      threadsHydrated: true,
    });
    page.viewport(1280, 960);
  });

  afterEach(() => {
    useSymphonyStore.getState().reset();
    useStore.setState({
      projects: [],
      threads: [],
      threadsHydrated: false,
    });
    Reflect.deleteProperty(window, "nativeApi");
    resetCachedNativeApiForTests();
  });

  it("hydrates the board, shows workflow summary, and reacts to task/run events", async () => {
    const task = createTask();
    const run = createRun();
    const nativeApi = installMockNativeApi({
      tasks: [task],
      runsByTaskId: { [task.id]: [run] },
      status: createOrchestratorStatus({ isRunning: true, activeRunCount: 1 }),
    });

    const screen = await render(<SymphonyDashboard />);

    await expect.element(page.getByRole("heading", { level: 1, name: "Symphony" })).toBeVisible();
    await expect.element(page.getByText("Symphony Project")).toBeInTheDocument();
    await expect.element(page.getByText("3 concurrent | 2 retries | 90s timeout")).toBeVisible();
    await expect.element(page.getByText("1 running")).toBeVisible();
    await expect.element(page.getByText("Total Tasks")).toBeVisible();
    await expect.element(page.getByText("Ship Symphony run events")).toBeVisible();
    await expect.element(page.getByText("backend")).toBeVisible();
    await expect.element(page.getByText("+1")).toBeVisible();
    await expect.element(page.getByRole("heading", { level: 3, name: "Backlog" })).toBeVisible();
    await expect.element(page.getByRole("heading", { level: 3, name: "Queued" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Stop" })).toBeVisible();

    const queuedTask = createTask({
      id: "task-symphony-queued" as SymphonyTaskId,
      title: "Run queued orchestration task",
      state: "queued",
      priority: "medium",
      labels: ["queue"],
      runCount: 1,
    });
    nativeApi.emitTaskEvent({ kind: "created", task: queuedTask });

    await expect.element(page.getByText("Run queued orchestration task")).toBeVisible();
    await vi.waitFor(() => {
      expect(useSymphonyStore.getState().tasks.get(queuedTask.id)).toEqual(queuedTask);
    });

    const completedRun = createRun({
      id: "run-symphony-2" as SymphonyRunId,
      status: "completed",
      completedAt: "2026-03-21T07:05:00.000Z",
      lastActivityAt: "2026-03-21T07:05:00.000Z",
    });
    nativeApi.emitRunEvent({
      kind: "completed",
      run: completedRun,
      taskId: task.id,
    });

    await vi.waitFor(() => {
      expect(useSymphonyStore.getState().runs.get(completedRun.id)).toEqual(completedRun);
    });

    expect(nativeApi.api.symphony.listTasks).toHaveBeenCalledWith(PROJECT_ID);
    expect(nativeApi.api.symphony.getRunHistory).toHaveBeenCalledWith(task.id);

    await screen.unmount();
  });

  it("starts the orchestrator from the header controls", async () => {
    const nativeApi = installMockNativeApi({
      tasks: [],
      status: createOrchestratorStatus({ isRunning: false }),
    });

    const screen = await render(<SymphonyDashboard />);

    const startButton = page.getByRole("button", { name: "Start" });
    await expect.element(startButton).toBeVisible();
    await startButton.click();

    await vi.waitFor(() => {
      expect(nativeApi.api.symphony.startOrchestrator).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        maxConcurrency: 3,
        stallTimeoutMs: 60_000,
      });
      expect(nativeApi.api.symphony.getOrchestratorStatus).toHaveBeenCalledWith(PROJECT_ID);
    });

    await expect.element(page.getByRole("button", { name: "Stop" })).toBeVisible();

    await screen.unmount();
  });
});
