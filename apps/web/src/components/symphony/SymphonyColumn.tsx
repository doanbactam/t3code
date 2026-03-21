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
  const meta = SYMPHONY_STATE_META[state];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border bg-card/95 shadow-sm transition-[border-color,box-shadow,background-color,transform] duration-150",
        meta.columnClassName,
        isOver && "border-primary/70 shadow-md ring-2 ring-primary/20",
      )}
    >
      <div className="shrink-0 border-b border-neutral-200/80 px-4 py-4 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.accentClassName)} />
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{meta.description}</p>
          </div>
          <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 tabular-nums dark:bg-neutral-800 dark:text-neutral-300">
            {tasks.length}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3 p-3">
          {tasks.map((task) => (
            <SymphonyTaskCard key={task.id} task={task} />
          ))}

          {tasks.length === 0 && (
            <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300/80 bg-background/70 px-4 text-center dark:border-neutral-700/80">
              <p className="text-sm font-medium text-foreground">{meta.emptyTitle}</p>
              <p className="mt-2 max-w-[20rem] text-xs leading-5 text-muted-foreground">
                {meta.emptyDescription}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
