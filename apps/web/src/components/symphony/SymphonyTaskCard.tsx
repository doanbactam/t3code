/**
 * SymphonyTaskCard
 *
 * Card component for a single task.
 */
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { SymphonyTask } from "@t3tools/contracts";
import { useSymphonyStore } from "~/symphonyStore";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { SYMPHONY_PRIORITY_CLASS, SYMPHONY_STATE_META } from "./presentation";

interface SymphonyTaskCardProps {
  readonly task: SymphonyTask;
}

export function SymphonyTaskCard({ task }: SymphonyTaskCardProps) {
  const selectTask = useSymphonyStore((state) => state.selectTask);
  const selectedTaskId = useSymphonyStore((state) => state.selectedTaskId);
  const isSelected = selectedTaskId === task.id;
  const stateMeta = SYMPHONY_STATE_META[task.state];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", taskId: task.id, state: task.state },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-card transition-[box-shadow,border-color,background-color,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md",
        "p-3.5 shadow-sm",
        isSelected && "border-primary ring-2 ring-primary/30",
        !isSelected && "hover:border-primary/40",
        isDragging && "opacity-50 shadow-lg",
      )}
      {...attributes}
      {...listeners}
      onClick={() => selectTask(task.id)}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", stateMeta.accentClassName)} />

      <div className="mb-2 flex items-start justify-between gap-2 pt-1">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span>{task.priority} priority</span>
            {task.workspaceKey ? (
              <span className="truncate rounded-full bg-muted px-2 py-0.5 normal-case tracking-normal text-muted-foreground">
                {task.workspaceKey}
              </span>
            ) : null}
          </div>
          <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {task.title}
          </h4>
        </div>
        {task.state === "running" && (
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 dark:bg-amber-950/30">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Running</span>
          </div>
        )}
      </div>

      {task.description && (
        <p className="mb-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
          {task.description}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn("h-6 text-xs", SYMPHONY_PRIORITY_CLASS[task.priority])}
        >
          {task.priority}
        </Badge>

        <Badge variant="secondary" className={cn("h-6 text-xs", stateMeta.badgeClassName)}>
          {stateMeta.title}
        </Badge>
      </div>

      {task.labels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {task.labels.slice(0, 2).map((label) => (
            <Badge key={label} variant="secondary" className="h-6 text-xs">
              {label}
            </Badge>
          ))}
          {task.labels.length > 2 && (
            <Badge variant="secondary" className="h-6 text-xs">
              +{task.labels.length - 2}
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-dashed border-neutral-200 pt-3 text-xs text-muted-foreground dark:border-neutral-800">
        <span>
          {task.runCount} run{task.runCount > 1 ? "s" : ""}
        </span>
        <span className="truncate">{stateMeta.description}</span>
      </div>
    </div>
  );
}
