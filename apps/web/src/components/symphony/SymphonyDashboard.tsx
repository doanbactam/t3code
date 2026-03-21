/**
 * SymphonyDashboard
 *
 * Main Symphony dashboard with Kanban board.
 */
import type { SymphonyTask, SymphonyWorkflow } from "@t3tools/contracts";
import { PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "~/components/ui/button";
import { Sheet, SheetPopup } from "~/components/ui/sheet";
import { toastManager } from "~/components/ui/toast";
import { readNativeApi } from "~/nativeApi";
import { selectSelectedTask, selectTasksByProject, useSymphonyStore } from "~/symphonyStore";
import { useStore } from "~/store";
import { SymphonyBoard } from "./SymphonyBoard";
import { SymphonyMetrics } from "./SymphonyMetrics";
import { SymphonyTaskDetail } from "./SymphonyTaskDetail";
import { SymphonyTaskForm } from "./SymphonyTaskForm";

const SYMPHONY_CREATE_TASK_EVENT = "symphony:create-task";

export function SymphonyDashboard() {
  const projects = useStore((store) => store.projects);
  const project = projects[0] ?? null;
  const projectId = project?.id ?? null;

  const tasks = useSymphonyStore(
    useShallow((state) =>
      projectId ? selectTasksByProject(projectId)(state) : [],
    ),
  );
  const selectedTask = useSymphonyStore(selectSelectedTask);
  const hydrated = useSymphonyStore((state) => state.hydrated);
  const setTasks = useSymphonyStore((state) => state.setTasks);
  const setRuns = useSymphonyStore((state) => state.setRuns);
  const setHydrated = useSymphonyStore((state) => state.setHydrated);
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
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-4">
        <div className="min-w-0">
          <h1 className="truncate font-semibold text-lg">Symphony</h1>
          <div className="text-sm text-muted-foreground">
            {project?.name ?? "Project"}
            {workflowSummary ? ` | ${workflowSummary}` : ""}
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            setTaskFormOpen(true);
          }}
        >
          <PlusIcon className="size-4" />
          New task
        </Button>
      </div>

      <SymphonyMetrics
        backlogCount={backlog.length}
        queuedCount={queued.length}
        runningCount={running.length}
        reviewCount={review.length}
        doneCount={done.length}
        failedCount={failed.length}
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden">
          <SymphonyBoard
            backlog={backlog}
            queued={queued}
            running={running}
            review={review}
            done={done}
            failed={failed}
          />
        </div>

        <div className="hidden w-[28rem] min-w-[28rem] border-l p-4 xl:block">
          <SymphonyTaskDetail
            task={selectedTask}
            cwd={project?.cwd}
            onEditTask={(task) => {
              setEditingTask(task);
              setTaskFormOpen(true);
            }}
          />
        </div>
      </div>

      <Sheet open={selectedTask !== null} onOpenChange={(open) => !open && selectTask(null)}>
        <SheetPopup side="right" className="xl:hidden">
          <SymphonyTaskDetail
            task={selectedTask}
            cwd={project?.cwd}
            onEditTask={(task) => {
              setEditingTask(task);
              setTaskFormOpen(true);
            }}
          />
        </SheetPopup>
      </Sheet>

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
