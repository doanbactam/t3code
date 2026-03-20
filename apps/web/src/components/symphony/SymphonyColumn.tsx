/**
 * SymphonyColumn
 *
 * Single column in the Kanban board.
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
        "flex w-72 flex-shrink-0 flex-col rounded-xl border transition-colors",
        SYMPHONY_STATE_META[state].columnClassName,
        isOver && "border-primary/60 shadow-sm ring-2 ring-primary/15",
      )}
    >
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {tasks.length}
        </span>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2 pb-2">
          {tasks.map((task) => (
            <SymphonyTaskCard key={task.id} task={task} />
          ))}

          {tasks.length === 0 && (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No tasks
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
