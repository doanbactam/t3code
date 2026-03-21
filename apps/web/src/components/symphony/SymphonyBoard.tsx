/**
 * SymphonyBoard
 *
 * Responsive grid-based task board with columns for each task state.
 * Adapts layout based on viewport: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
 */
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { SymphonyTask } from "@t3tools/contracts";
import { useState } from "react";
import { SymphonyColumn } from "./SymphonyColumn";
import { toastManager } from "~/components/ui/toast";
import { readNativeApi } from "~/nativeApi";

interface SymphonyBoardProps {
  readonly backlog: SymphonyTask[];
  readonly queued: SymphonyTask[];
  readonly running: SymphonyTask[];
  readonly review: SymphonyTask[];
  readonly done: SymphonyTask[];
  readonly failed: SymphonyTask[];
}

export function SymphonyBoard({
  backlog,
  queued,
  running,
  review,
  done,
  failed,
}: SymphonyBoardProps) {
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 6,
      },
    }),
  );
  const tasksById = new Map(
    [...backlog, ...queued, ...running, ...review, ...done, ...failed].map((task) => [
      String(task.id),
      task,
    ]),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    setMovingTaskId(null);

    const activeTaskId = String(event.active.id);
    const activeTask = tasksById.get(activeTaskId);
    if (!activeTask || !event.over) return;

    const overData = event.over.data.current as
      | { type: "column"; state: typeof activeTask.state }
      | { type: "task"; state: typeof activeTask.state }
      | undefined;
    const nextState = overData?.state;

    if (!nextState || nextState === activeTask.state) return;

    const api = readNativeApi();
    if (!api) return;

    setMovingTaskId(activeTask.id);
    try {
      await api.symphony.moveTask({
        taskId: activeTask.id,
        newState: nextState,
      });
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "Failed to move task",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setMovingTaskId(null);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event) => setMovingTaskId(String(event.active.id))}
      onDragEnd={(event) => void handleDragEnd(event)}
      onDragCancel={() => setMovingTaskId(null)}
    >
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-dashed border-neutral-200 px-4 py-3 text-xs text-muted-foreground dark:border-neutral-800">
          Drag tasks between lanes to re-prioritize work, trigger execution, and keep review
          visible.
        </div>

        <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <SymphonyColumn title="Backlog" tasks={backlog} state="backlog" />
          <SymphonyColumn title="Queued" tasks={queued} state="queued" />
          <SymphonyColumn title="Running" tasks={running} state="running" />
          <SymphonyColumn title="Review" tasks={review} state="review" />
          <SymphonyColumn title="Done" tasks={done} state="done" />
          <SymphonyColumn title="Failed" tasks={failed} state="failed" />
        </div>
      </div>

      {movingTaskId ? (
        <div className="pointer-events-none fixed right-6 bottom-6 rounded-full border border-neutral-200 bg-card px-4 py-2 text-xs font-medium text-foreground shadow-md dark:border-neutral-800">
          Moving task...
        </div>
      ) : null}
    </DndContext>
  );
}
