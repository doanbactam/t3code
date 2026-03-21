/**
 * Symphony State Store
 *
 * Zustand store for Symphony orchestration state.
 *
 * @module symphonyStore
 */
import type {
  SymphonyTask,
  SymphonyRun,
  SymphonyTaskId,
  SymphonyRunId,
  SymphonyTaskEventPayload,
  SymphonyRunEventPayload,
  ProjectId,
  SymphonyTaskPriority,
  SymphonyTaskState,
  SymphonyOrchestratorStatus,
} from "@t3tools/contracts";
import { create } from "zustand";

// ── State Types ────────────────────────────────────────────────────────

export interface SymphonyBoardFilter {
  readonly priority?: SymphonyTaskPriority;
  readonly labels?: string[];
}

export interface SymphonyState {
  // Data
  tasks: Map<SymphonyTaskId, SymphonyTask>;
  runs: Map<SymphonyRunId, SymphonyRun>;

  // Orchestrator
  orchestratorStatus: SymphonyOrchestratorStatus | null;

  isOrchestratorStarting: boolean;

  // Selection
  selectedTaskId: SymphonyTaskId | null;

  // Filtering
  boardFilter: SymphonyBoardFilter;

  // Hydration
  hydrated: boolean;
}

// ── Actions ────────────────────────────────────────────────────────────

export interface SymphonyActions {
  // Task actions
  setTasks: (tasks: SymphonyTask[]) => void;
  upsertTask: (task: SymphonyTask) => void;
  removeTask: (taskId: SymphonyTaskId) => void;

  // Run actions
  setRuns: (runs: SymphonyRun[]) => void;
  upsertRun: (run: SymphonyRun) => void;

  // Orchestrator
  setOrchestratorStatus: (status: SymphonyOrchestratorStatus | null) => void;
  setOrchestratorStarting: (starting: boolean) => void;

  // Selection
  selectTask: (taskId: SymphonyTaskId | null) => void;

  // Filtering
  setBoardFilter: (filter: SymphonyBoardFilter) => void;

  // Hydration
  setHydrated: (hydrated: boolean) => void;

  // Event handlers
  handleTaskEvent: (event: SymphonyTaskEventPayload) => void;
  handleRunEvent: (event: SymphonyRunEventPayload) => void;

  // Reset
  reset: () => void;
}

// ── Initial State ──────────────────────────────────────────────────────

const initialState: SymphonyState = {
  tasks: new Map(),
  runs: new Map(),
  orchestratorStatus: null,
  isOrchestratorStarting: false,
  selectedTaskId: null,
  boardFilter: {},
  hydrated: false,
};

// ── Store ───────────────────────────────────────────────────────────────

export const useSymphonyStore = create<SymphonyState & SymphonyActions>()((set, get) => ({
  ...initialState,

  // Task actions
  setTasks: (tasks) =>
    set((state) => {
      const newTasks = new Map(state.tasks);
      for (const task of tasks) {
        newTasks.set(task.id, task);
      }
      return { tasks: newTasks };
    }),

  upsertTask: (task) =>
    set((state) => {
      const newTasks = new Map(state.tasks);
      newTasks.set(task.id, task);
      return { tasks: newTasks };
    }),

  removeTask: (taskId) =>
    set((state) => {
      const newTasks = new Map(state.tasks);
      newTasks.delete(taskId);
      const newRuns = new Map(state.runs);
      // Also remove associated runs
      for (const [runId, run] of newRuns) {
        if (run.taskId === taskId) {
          newRuns.delete(runId);
        }
      }
      return {
        tasks: newTasks,
        runs: newRuns,
        selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
      };
    }),

  // Run actions
  setRuns: (runs) =>
    set((state) => {
      const newRuns = new Map(state.runs);
      for (const run of runs) {
        newRuns.set(run.id, run);
      }
      return { runs: newRuns };
    }),

  upsertRun: (run) =>
    set((state) => {
      const newRuns = new Map(state.runs);
      newRuns.set(run.id, run);
      return { runs: newRuns };
    }),

  // Orchestrator
  setOrchestratorStatus: (status) => set({ orchestratorStatus: status }),
  setOrchestratorStarting: (starting) => set({ isOrchestratorStarting: starting }),

  // Selection
  selectTask: (taskId) => set({ selectedTaskId: taskId }),

  // Filtering
  setBoardFilter: (filter) => set({ boardFilter: filter }),

  // Hydration
  setHydrated: (hydrated) => set({ hydrated }),

  // Event handlers
  handleTaskEvent: (event) => {
    const { upsertTask, removeTask } = get();
    switch (event.kind) {
      case "created":
      case "updated":
      case "state-changed":
        upsertTask(event.task);
        break;
      case "deleted":
        removeTask(event.task.id);
        break;
    }
  },

  handleRunEvent: (event) => {
    const { upsertRun } = get();
    upsertRun(event.run);
  },

  // Reset
  reset: () => set(initialState),
}));

// ── Selectors ──────────────────────────────────────────────────────────

export const selectTasksByProject = (projectId: ProjectId) => (state: SymphonyState) =>
  Array.from(state.tasks.values()).filter((task) => task.projectId === projectId);

export const selectTasksByState = (stateValue: SymphonyTaskState) => (state: SymphonyState) =>
  Array.from(state.tasks.values()).filter((task) => task.state === stateValue);

export const selectRunsByTask = (taskId: SymphonyTaskId) => (state: SymphonyState) =>
  Array.from(state.runs.values())
    .filter((run) => run.taskId === taskId)
    .sort((a, b) => a.attempt - b.attempt);

export const selectSelectedTask = (state: SymphonyState) =>
  state.selectedTaskId ? (state.tasks.get(state.selectedTaskId) ?? null) : null;

export const selectActiveRuns = (state: SymphonyState) =>
  Array.from(state.runs.values()).filter((run) => run.status === "running");

export const selectOrchestratorStatus = (state: SymphonyState) => state.orchestratorStatus;
export const selectIsOrchestratorStarting = (state: SymphonyState) => state.isOrchestratorStarting;
