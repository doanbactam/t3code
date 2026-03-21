/**
 * SymphonyTaskDetailDialog
 *
 * Modal dialog for viewing/managing task details.
 * Replaces right sidebar with modal design for better focus.
 */
import type { SymphonyRunId, SymphonyTask, SymphonyTaskState } from "@t3tools/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { PencilIcon, RotateCcwIcon, SquareIcon, Trash2Icon } from "lucide-react";
import { useAppSettings } from "~/appSettings";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { toastManager } from "~/components/ui/toast";
import { cn } from "~/lib/utils";
import { readNativeApi } from "~/nativeApi";
import { selectRunsByTask, useSymphonyStore } from "~/symphonyStore";
import { formatTimestamp } from "~/timestampFormat";
import { SymphonyRunHistory } from "./SymphonyRunHistory";
import { SymphonyRunOutput } from "./SymphonyRunOutput";
import { SYMPHONY_PRIORITY_CLASS, SYMPHONY_STATE_META } from "./presentation";

interface SymphonyTaskDetailDialogProps {
  readonly task: SymphonyTask | null;
  readonly cwd: string | undefined;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onEditTask: (task: SymphonyTask) => void;
}

type Tab = "overview" | "runs" | "actions";

export function SymphonyTaskDetailDialog({
  task,
  cwd,
  open,
  onOpenChange,
  onEditTask,
}: SymphonyTaskDetailDialogProps) {
  const { settings } = useAppSettings();
  const selectTask = useSymphonyStore((state) => state.selectTask);
  const runsRaw = useSymphonyStore(
    useShallow((state) => (task ? selectRunsByTask(task.id)(state) : [])),
  );
  const runs = useMemo(() => [...runsRaw].toReversed(), [runsRaw]);
  const [selectedRunId, setSelectedRunId] = useState<SymphonyRunId | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const prevTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prevTaskId = prevTaskIdRef.current;
    prevTaskIdRef.current = task?.id ?? null;

    if (!task) {
      setSelectedRunId(null);
      return;
    }

    if (prevTaskId !== task.id) {
      const preferredRunId = task.currentRunId ?? runs[0]?.id ?? null;
      setSelectedRunId(preferredRunId);
      setActiveTab("overview");
    }
  }, [task, runs, task?.id]);

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? null,
    [runs, selectedRunId],
  );

  const runTaskAction = async (
    actionKey: string,
    action: () => Promise<unknown>,
    errorTitle: string,
  ) => {
    setPendingAction(actionKey);
    try {
      await action();
    } catch (error) {
      toastManager.add({
        type: "error",
        title: errorTitle,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const moveTask = async (newState: SymphonyTaskState) => {
    if (!task) return;
    const api = readNativeApi();
    if (!api) return;

    await runTaskAction(
      `move:${newState}`,
      () => api.symphony.moveTask({ taskId: task.id, newState }),
      "Failed to move task",
    );
  };

  const retryTask = async () => {
    if (!task) return;
    const api = readNativeApi();
    if (!api) return;

    await runTaskAction("retry", () => api.symphony.retryTask(task.id), "Failed to retry task");
  };

  const stopTask = async () => {
    if (!task) return;
    const api = readNativeApi();
    if (!api) return;

    await runTaskAction("stop", () => api.symphony.stopTask(task.id), "Failed to stop task");
  };

  const deleteTask = async () => {
    if (!task) return;
    const api = readNativeApi();
    if (!api) return;

    const confirmed = await api.dialogs.confirm(`Delete task "${task.title}"?`);
    if (!confirmed) return;

    await runTaskAction(
      "delete",
      async () => {
        await api.symphony.deleteTask(task.id);
        selectTask(null);
        onOpenChange(false);
      },
      "Failed to delete task",
    );
  };

  if (!task) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-2">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold truncate">{task.title}</DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2">
                {task.description || (
                  <span className="text-muted-foreground italic">No description</span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-2 px-6">
          <Badge
            variant="outline"
            className={cn("text-sm", SYMPHONY_STATE_META[task.state].badgeClassName)}
          >
            {SYMPHONY_STATE_META[task.state].title}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-sm", SYMPHONY_PRIORITY_CLASS[task.priority])}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Badge>
          {task.labels.length > 0 && (
            <div className="flex gap-1">
              {task.labels.map((label) => (
                <Badge key={label} variant="secondary" className="text-sm">
                  {label}
                </Badge>
              ))}
            </div>
          )}
          <div className="text-xs text-muted-foreground ml-auto">
            {task.runCount} run{task.runCount !== 1 ? "s" : ""}
          </div>
        </div>

        <Separator className="mt-4" />

        {/* Tabs */}
        <div className="flex border-b px-6 -mx-6">
          {(["overview", "runs", "actions"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "overview" && "Overview"}
              {tab === "runs" && "Runs"}
              {tab === "actions" && "Actions"}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="px-6 py-4">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Task Metadata */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Task Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">State</span>
                      <span className="font-medium">{SYMPHONY_STATE_META[task.state].title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority</span>
                      <span className="font-medium capitalize">{task.priority}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">
                        {formatTimestamp(task.createdAt, settings.timestampFormat)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="font-medium">
                        {formatTimestamp(task.updatedAt, settings.timestampFormat)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Description</h3>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {task.description}
                      </p>
                    </div>
                  </>
                )}

                {/* Labels */}
                {task.labels.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Labels</h3>
                      <div className="flex flex-wrap gap-2">
                        {task.labels.map((label) => (
                          <Badge key={label} variant="secondary">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Runs Tab */}
            {activeTab === "runs" && (
              <div className="space-y-4">
                {runs.length > 0 ? (
                  <>
                    <SymphonyRunHistory
                      runs={runs}
                      selectedRunId={selectedRunId}
                      timestampFormat={settings.timestampFormat}
                      onSelectRun={setSelectedRunId}
                    />
                    {selectedRun && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm">Run Output</h3>
                          <SymphonyRunOutput
                            run={selectedRun}
                            cwd={cwd}
                            timestampFormat={settings.timestampFormat}
                          />
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground italic py-8">
                    No runs yet. Move task to "queued" to start execution.
                  </div>
                )}
              </div>
            )}

            {/* Actions Tab */}
            {activeTab === "actions" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Task Actions</h3>

                  {/* State Transitions */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Move to state:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {["backlog", "queued", "running", "review", "done", "failed"].map((state) => (
                        <Button
                          key={state}
                          variant="outline"
                          size="sm"
                          disabled={
                            state === task.state ||
                            pendingAction?.startsWith("move:") ||
                            pendingAction === "delete"
                          }
                          onClick={() => moveTask(state as SymphonyTaskState)}
                          className="justify-start"
                        >
                          {SYMPHONY_STATE_META[state as SymphonyTaskState].title}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Execution Controls */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Execution</h3>
                  <div className="space-y-2">
                    {task.state === "running" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        disabled={pendingAction === "stop"}
                        onClick={stopTask}
                      >
                        <SquareIcon className="size-4" />
                        Stop Task
                      </Button>
                    )}
                    {task.state === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        disabled={pendingAction === "retry"}
                        onClick={retryTask}
                      >
                        <RotateCcwIcon className="size-4" />
                        Retry Task
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Management */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Management</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => onEditTask(task)}
                    >
                      <PencilIcon className="size-4" />
                      Edit Task
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full justify-start gap-2"
                      disabled={pendingAction === "delete"}
                      onClick={deleteTask}
                    >
                      <Trash2Icon className="size-4" />
                      Delete Task
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
