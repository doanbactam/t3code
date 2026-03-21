import type { SymphonyRunId, SymphonyTask, SymphonyTaskState } from "@t3tools/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { PencilIcon, PlayIcon, RotateCcwIcon, SquareIcon, Trash2Icon } from "lucide-react";
import { useAppSettings } from "~/appSettings";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { toastManager } from "~/components/ui/toast";
import { cn } from "~/lib/utils";
import { readNativeApi } from "~/nativeApi";
import { selectRunsByTask, useSymphonyStore } from "~/symphonyStore";
import { formatTimestamp } from "~/timestampFormat";
import { SymphonyRunHistory } from "./SymphonyRunHistory";
import { SymphonyRunOutput } from "./SymphonyRunOutput";
import { SYMPHONY_PRIORITY_CLASS, SYMPHONY_STATE_META } from "./presentation";

interface SymphonyTaskDetailProps {
  readonly task: SymphonyTask | null;
  readonly cwd: string | undefined;
  readonly onEditTask: (task: SymphonyTask) => void;
}

export function SymphonyTaskDetail({ task, cwd, onEditTask }: SymphonyTaskDetailProps) {
  const { settings } = useAppSettings();
  const selectTask = useSymphonyStore((state) => state.selectTask);
  const runsRaw = useSymphonyStore(
    useShallow((state) =>
      task ? selectRunsByTask(task.id)(state) : [],
    ),
  );
  // Memoize reversed runs to prevent infinite loop from new array reference each render
  const runs = useMemo(() => [...runsRaw].reverse(), [runsRaw]);
  const [selectedRunId, setSelectedRunId] = useState<SymphonyRunId | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const prevTaskIdRef = useRef<string | null>(null);

  // Only update selection when task changes, not when runs array reference changes
  useEffect(() => {
    const prevTaskId = prevTaskIdRef.current;
    prevTaskIdRef.current = task?.id ?? null;

    if (!task) {
      setSelectedRunId(null);
      return;
    }

    // Only reset selection if task actually changed
    if (prevTaskId !== task.id) {
      const preferredRunId = task.currentRunId ?? runs[0]?.id ?? null;
      setSelectedRunId(preferredRunId);
    }
  }, [task?.id]);

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
      },
      "Failed to delete task",
    );
  };

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
        <div>
          <div className="font-medium text-sm">No task selected</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a card to inspect details, run history, and controls.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="space-y-4 border-b p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs", SYMPHONY_STATE_META[task.state].badgeClassName)}
              >
                {SYMPHONY_STATE_META[task.state].title}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-xs", SYMPHONY_PRIORITY_CLASS[task.priority])}
              >
                {task.priority}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold leading-tight">{task.title}</h2>
            <div className="text-xs text-muted-foreground">
              Updated {formatTimestamp(task.updatedAt, settings.timestampFormat)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onEditTask(task)}>
              <PencilIcon className="size-4" />
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => selectTask(null)}>
              Close
            </Button>
          </div>
        </div>

        {task.description ? (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No description provided.</p>
        )}

        {task.labels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {task.labels.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {task.state === "backlog" ? (
            <Button
              size="sm"
              onClick={() => void moveTask("queued")}
              disabled={pendingAction !== null}
            >
              <PlayIcon className="size-4" />
              Queue
            </Button>
          ) : null}
          {task.state === "queued" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void moveTask("backlog")}
              disabled={pendingAction !== null}
            >
              Move to backlog
            </Button>
          ) : null}
          {task.state === "review" ? (
            <Button
              size="sm"
              onClick={() => void moveTask("done")}
              disabled={pendingAction !== null}
            >
              Mark done
            </Button>
          ) : null}
          {task.state === "failed" || task.state === "review" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void retryTask()}
              disabled={pendingAction !== null}
            >
              <RotateCcwIcon className="size-4" />
              Retry
            </Button>
          ) : null}
          {task.state === "running" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void stopTask()}
              disabled={pendingAction !== null}
            >
              <SquareIcon className="size-4" />
              Stop
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void deleteTask()}
            disabled={pendingAction !== null}
          >
            <Trash2Icon className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="min-h-0 border-b p-5 lg:border-r lg:border-b-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium text-sm">Run history</div>
            <div className="text-xs text-muted-foreground">{runs.length} total</div>
          </div>
          <SymphonyRunHistory
            runs={runs}
            selectedRunId={selectedRun?.id ?? null}
            timestampFormat={settings.timestampFormat}
            onSelectRun={setSelectedRunId}
          />

          <Separator className="my-4" />

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Workspace</dt>
              <dd className="truncate font-mono text-xs">{task.workspaceKey}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Runs</dt>
              <dd>{task.runCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatTimestamp(task.createdAt, settings.timestampFormat)}</dd>
            </div>
          </dl>
        </div>

        <div className="min-h-0 overflow-auto p-5">
          <div className="mb-3 font-medium text-sm">Run details</div>
          <SymphonyRunOutput
            run={selectedRun}
            cwd={cwd}
            timestampFormat={settings.timestampFormat}
          />
        </div>
      </div>
    </div>
  );
}
