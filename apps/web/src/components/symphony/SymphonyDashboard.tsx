/**
 * SymphonyDashboard
 *
 * Main Symphony dashboard with Kanban board.
 */
import type { SymphonyTask, SymphonyWorkflow } from "@t3tools/contracts";
import { PauseIcon, PlayIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "~/components/ui/button";
import { toastManager } from "~/components/ui/toast";
import { readNativeApi } from "~/nativeApi";
import {
  selectSelectedTask,
  selectTasksByProject,
  selectOrchestratorStatus,
  selectIsOrchestratorStarting,
  useSymphonyStore,
} from "~/symphonyStore";
import { useStore } from "~/store";
import { SymphonyBoard } from "./SymphonyBoard";
import { SymphonyMetrics } from "./SymphonyMetrics";
import { SymphonyTaskDetailDialog } from "./SymphonyTaskDetailDialog";
import { SymphonyTaskForm } from "./SymphonyTaskForm";

const SYMPHONY_CREATE_TASK_EVENT = "symphony:create-task";

export function SymphonyDashboard() {
  const projects = useStore((store) => store.projects);
  const project = projects[0] ?? null;
  const projectId = project?.id ?? null;

  const tasks = useSymphonyStore(
    useShallow((state) => (projectId ? selectTasksByProject(projectId)(state) : [])),
  );
  const selectedTask = useSymphonyStore(selectSelectedTask);
  const hydrated = useSymphonyStore((state) => state.hydrated);
  const orchestratorStatus = useSymphonyStore(selectOrchestratorStatus);
  const isOrchestratorStarting = useSymphonyStore(selectIsOrchestratorStarting);
  const setTasks = useSymphonyStore((state) => state.setTasks);
  const setRuns = useSymphonyStore((state) => state.setRuns);
  const setHydrated = useSymphonyStore((state) => state.setHydrated);
  const setOrchestratorStatus = useSymphonyStore((state) => state.setOrchestratorStatus);
  const setOrchestratorStarting = useSymphonyStore((state) => state.setOrchestratorStarting);
  const handleTaskEvent = useSymphonyStore((state) => state.handleTaskEvent);
  const handleRunEvent = useSymphonyStore((state) => state.handleRunEvent);
  const selectTask = useSymphonyStore((state) => state.selectTask);
  const [workflow, setWorkflow] = useState<SymphonyWorkflow | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SymphonyTask | null>(null);

  useEffect(() => {
    const api = readNativeApi();
    if (!api) return;

    const unsubTask = api.symphony.onTaskEvent((event) => {
      handleTaskEvent(event);
    });
    const unsubRun = api.symphony.onRunEvent((event) => {
      handleRunEvent(event);
    });

    return () => {
      unsubTask();
      unsubRun();
    };
  }, [handleTaskEvent, handleRunEvent]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpenCreate = () => {
      setEditingTask(null);
      setTaskFormOpen(true);
    };

    window.addEventListener(SYMPHONY_CREATE_TASK_EVENT, handleOpenCreate);
    return () => window.removeEventListener(SYMPHONY_CREATE_TASK_EVENT, handleOpenCreate);
  }, []);

  useEffect(() => {
    if (!projectId || hydrated) return;

    const api = readNativeApi();
    if (!api) return;

    let cancelled = false;

    const hydrate = async () => {
      try {
        const { tasks } = await api.symphony.listTasks(projectId);
        if (cancelled) return;
        setTasks(tasks);

        const runResults = await Promise.all(
          tasks.map((task) => api.symphony.getRunHistory(task.id)),
        );
        if (cancelled) return;

        setRuns(runResults.flatMap((result) => result.runs));

        try {
          const { workflow } = await api.symphony.getWorkflow(projectId);
          if (!cancelled) {
            setWorkflow(workflow);
          }
        } catch (error) {
          console.warn("Failed to load Symphony workflow:", error);
          if (!cancelled) {
            setWorkflow(null);
          }
        }

        setHydrated(true);
      } catch (error) {
        console.error("Failed to hydrate Symphony store:", error);
        toastManager.add({
          type: "error",
          title: "Failed to load Symphony board",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [projectId, hydrated, setHydrated, setRuns, setTasks]);

  // Poll orchestrator status
  useEffect(() => {
    if (!projectId || !hydrated) return;

    const api = readNativeApi();
    if (!api) return;

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const { status } = await api.symphony.getOrchestratorStatus(projectId);
        if (!cancelled) {
          setOrchestratorStatus(status);
        }
      } catch (error) {
        console.warn("Failed to get orchestrator status:", error);
      }
    };

    void pollStatus();

    const interval = setInterval(pollStatus, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId, hydrated, setOrchestratorStatus]);

  const handleStartOrchestrator = async () => {
    if (!projectId) return;

    const api = readNativeApi();
    if (!api) return;

    setOrchestratorStarting(true);
    try {
      await api.symphony.startOrchestrator({
        projectId,
        maxConcurrency: workflow?.config.agent?.maxConcurrency,
        stallTimeoutMs: workflow?.config.agent?.stallTimeoutMs,
      });
      const { status } = await api.symphony.getOrchestratorStatus(projectId);
      setOrchestratorStatus(status);
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "Failed to start orchestrator",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setOrchestratorStarting(false);
    }
  };

  const handleStopOrchestrator = async () => {
    if (!projectId) return;

    const api = readNativeApi();
    if (!api) return;

    try {
      await api.symphony.stopOrchestrator(projectId);
      const { status } = await api.symphony.getOrchestratorStatus(projectId);
      setOrchestratorStatus(status);
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "Failed to stop orchestrator",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const backlog = tasks.filter((task) => task.state === "backlog");
  const queued = tasks.filter((task) => task.state === "queued");
  const running = tasks.filter((task) => task.state === "running");
  const review = tasks.filter((task) => task.state === "review");
  const done = tasks.filter((task) => task.state === "done");
  const failed = tasks.filter((task) => task.state === "failed");
  const workflowSummary = useMemo(() => {
    if (!workflow?.config.agent) return null;

    const parts = [
      workflow.config.agent.maxConcurrency
        ? `${workflow.config.agent.maxConcurrency} concurrent`
        : null,
      workflow.config.agent.maxRetries !== undefined
        ? `${workflow.config.agent.maxRetries} retries`
        : null,
      workflow.config.agent.turnTimeoutMs
        ? `${Math.round(workflow.config.agent.turnTimeoutMs / 1000)}s timeout`
        : null,
    ].filter((value): value is string => value !== null);

    return parts.join(" | ");
  }, [workflow]);
  const totalTasks = tasks.length;
  const hasActiveWork = queued.length + running.length + review.length + failed.length > 0;
  const orchestratorTone = orchestratorStatus?.isRunning
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900"
    : "bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-800";

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No projects available</p>
          <p className="mt-1 text-xs">Add a project to use Symphony</p>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_24%)]">
      <div className="border-b bg-card/95 px-6 py-5 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">Symphony</h1>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${orchestratorTone}`}
              >
                <span
                  className={`size-2 rounded-full ${orchestratorStatus?.isRunning ? "animate-pulse bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-500"}`}
                />
                {orchestratorStatus?.isRunning ? "Orchestrator running" : "Orchestrator idle"}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">{project?.name ?? "Project"}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Coordinate backlog, execution, and review in one board so autonomous work stays
              visible and easy to steer.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {workflowSummary ? (
                <span className="rounded-full border border-neutral-200 bg-background px-3 py-1 dark:border-neutral-800">
                  {workflowSummary}
                </span>
              ) : null}
              <span className="rounded-full border border-neutral-200 bg-background px-3 py-1 dark:border-neutral-800">
                {totalTasks} total task{totalTasks !== 1 ? "s" : ""}
              </span>
              <span className="rounded-full border border-neutral-200 bg-background px-3 py-1 dark:border-neutral-800">
                {orchestratorStatus?.activeRunCount ?? 0} running
              </span>
              {workflow?.config.agent?.stallTimeoutMs ? (
                <span className="rounded-full border border-neutral-200 bg-background px-3 py-1 dark:border-neutral-800">
                  Stall timeout {Math.round(workflow.config.agent.stallTimeoutMs / 1000)}s
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {orchestratorStatus?.isRunning ? (
              <Button
                variant="outline"
                onClick={handleStopOrchestrator}
                disabled={isOrchestratorStarting}
                title="Stop the orchestrator"
              >
                <PauseIcon className="size-4" />
                Stop
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleStartOrchestrator}
                disabled={isOrchestratorStarting}
                title="Start the orchestrator"
              >
                <PlayIcon className="size-4" />
                {isOrchestratorStarting ? "Starting..." : "Start"}
              </Button>
            )}
            <Button
              onClick={() => {
                setEditingTask(null);
                setTaskFormOpen(true);
              }}
              title="Create a new task"
              className="gap-2 font-semibold"
            >
              <PlusIcon className="size-4" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      <SymphonyMetrics
        backlogCount={backlog.length}
        queuedCount={queued.length}
        runningCount={running.length}
        reviewCount={review.length}
        doneCount={done.length}
        failedCount={failed.length}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {totalTasks === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="max-w-lg rounded-3xl border border-dashed border-neutral-300 bg-card/90 p-8 text-center shadow-sm dark:border-neutral-700">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <SparklesIcon className="size-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">
                Build your first Symphony workflow
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Create a task, move it into the queue, then start the orchestrator when you are
                ready to let the system execute in parallel.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-800">
                  Capture work in backlog
                </span>
                <span className="rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-800">
                  Queue what should run next
                </span>
                <span className="rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-800">
                  Review results before done
                </span>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    setEditingTask(null);
                    setTaskFormOpen(true);
                  }}
                  className="gap-2"
                >
                  <PlusIcon className="size-4" />
                  Create first task
                </Button>
                {!orchestratorStatus?.isRunning && hasActiveWork ? (
                  <Button variant="outline" onClick={() => void handleStartOrchestrator()}>
                    <PlayIcon className="size-4" />
                    Start orchestrator
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <SymphonyBoard
            backlog={backlog}
            queued={queued}
            running={running}
            review={review}
            done={done}
            failed={failed}
          />
        )}
      </div>

      <SymphonyTaskDetailDialog
        task={selectedTask}
        cwd={project?.cwd}
        open={selectedTask !== null}
        onOpenChange={(open) => !open && selectTask(null)}
        onEditTask={(task) => {
          setEditingTask(task);
          setTaskFormOpen(true);
        }}
      />

      <SymphonyTaskForm
        open={taskFormOpen}
        onOpenChange={(open) => {
          setTaskFormOpen(open);
          if (!open) {
            setEditingTask(null);
          }
        }}
        projectId={projectId}
        task={editingTask}
      />
    </div>
  );
}
