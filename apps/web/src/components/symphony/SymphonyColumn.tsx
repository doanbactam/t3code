/**
 * SymphonyColumn
 *
 * Single column in the task board. Works in both scrollable and grid layouts.
 */
import { useDroppable } from "@dnd-kit/core";
import type { SymphonyTask, SymphonyTaskState } from "@t3tools/contracts";
import { SymphonyTaskCard } from "./SymphonyTaskCard";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { SYMPHONY_STATE_META } from "./presentation";

interface SymphonyColumnProps {
  readonly title: string;
  readonly tasks: SymphonyTask[];
  readonly state: SymphonyTaskState;
}

export function SymphonyColumn({ title, tasks, state }: SymphonyColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column:${state}`,
    data: { type: "column", state },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-screen flex-col rounded-lg border bg-card shadow-sm transition-[border-color,box-shadow,background-color] duration-150",
        SYMPHONY_STATE_META[state].columnClassName,
        isOver && "border-primary/70 shadow-md ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800 shrink-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 tabular-nums dark:bg-neutral-800 dark:text-neutral-300">
          {tasks.length}
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 p-3">
          {tasks.map((task) => (
            <SymphonyTaskCard key={task.id} task={task} />
          ))}

          {tasks.length === 0 && (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
              No tasks
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
