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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", taskId: task.id, state: task.state },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "cursor-pointer rounded-lg border bg-card transition-[box-shadow,border-color,background-color] duration-150 hover:shadow-md",
        "p-3 shadow-sm",
        isSelected && "border-primary ring-2 ring-primary ring-opacity-50",
        !isSelected && "hover:border-primary/50",
        isDragging && "opacity-50 shadow-lg",
      )}
      {...attributes}
      {...listeners}
      onClick={() => selectTask(task.id)}
    >
      {/* Header with title and running indicator */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 flex-1 text-sm font-medium leading-snug">{task.title}</h4>
        {task.state === "running" && (
          <div className="flex shrink-0 items-center gap-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Running</span>
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="mb-2.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      {/* Metadata: Priority + State */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn("text-xs h-6", SYMPHONY_PRIORITY_CLASS[task.priority])}
        >
          {task.priority}
        </Badge>

        <Badge
          variant="secondary"
          className={cn("text-xs h-6", SYMPHONY_STATE_META[task.state].badgeClassName)}
        >
          {SYMPHONY_STATE_META[task.state].title}
        </Badge>
      </div>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 2).map((label) => (
            <Badge key={label} variant="secondary" className="text-xs h-6">
              {label}
            </Badge>
          ))}
          {task.labels.length > 2 && (
            <Badge variant="secondary" className="text-xs h-6">
              +{task.labels.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Run count */}
      {task.runCount > 0 && (
        <div className="text-xs font-medium text-muted-foreground">
          {task.runCount} run{task.runCount > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
