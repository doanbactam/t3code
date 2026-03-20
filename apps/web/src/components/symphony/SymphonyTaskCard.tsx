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
        "cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-[box-shadow,transform,opacity] hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        isDragging && "opacity-60 shadow-lg",
      )}
      {...attributes}
      {...listeners}
      onClick={() => selectTask(task.id)}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-sm font-medium">{task.title}</h4>
        {task.state === "running" && (
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
        )}
      </div>

      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("text-xs", SYMPHONY_PRIORITY_CLASS[task.priority])}>
          {task.priority}
        </Badge>

        <Badge
          variant="secondary"
          className={cn("text-xs", SYMPHONY_STATE_META[task.state].badgeClassName)}
        >
          {SYMPHONY_STATE_META[task.state].title}
        </Badge>

        {task.labels.length > 0 && (
          <div className="flex gap-1">
            {task.labels.slice(0, 2).map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
            {task.labels.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{task.labels.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>

      {task.runCount > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          {task.runCount} run{task.runCount > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
