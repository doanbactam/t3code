import type {
  SymphonyRunStatus,
  SymphonyTaskPriority,
  SymphonyTaskState,
} from "@t3tools/contracts";

export const SYMPHONY_STATE_META: Record<
  SymphonyTaskState,
  {
    readonly title: string;
    readonly description: string;
    readonly emptyTitle: string;
    readonly emptyDescription: string;
    readonly columnClassName: string;
    readonly accentClassName: string;
    readonly badgeClassName: string;
  }
> = {
  backlog: {
    title: "Backlog",
    description: "Ideas and scoped work waiting to be scheduled.",
    emptyTitle: "Nothing in backlog",
    emptyDescription: "Newly created work will land here until it is queued.",
    columnClassName: "bg-neutral-50 dark:bg-neutral-900/30",
    accentClassName: "bg-neutral-400 dark:bg-neutral-500",
    badgeClassName: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  queued: {
    title: "Queued",
    description: "Ready for execution as soon as capacity opens up.",
    emptyTitle: "Queue is clear",
    emptyDescription: "Drag backlog items here to line them up for the orchestrator.",
    columnClassName: "bg-blue-50 dark:bg-blue-950/30",
    accentClassName: "bg-blue-500 dark:bg-blue-400",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  running: {
    title: "Running",
    description: "Tasks actively handled by Symphony right now.",
    emptyTitle: "No active runs",
    emptyDescription: "Start the orchestrator or queue work to see live execution here.",
    columnClassName: "bg-amber-50 dark:bg-amber-950/30",
    accentClassName: "bg-amber-500 dark:bg-amber-400",
    badgeClassName: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  review: {
    title: "Review",
    description: "Output is ready for a human pass and approval.",
    emptyTitle: "Review lane is empty",
    emptyDescription: "Completed execution that needs eyes-on review will collect here.",
    columnClassName: "bg-violet-50 dark:bg-violet-950/30",
    accentClassName: "bg-violet-500 dark:bg-violet-400",
    badgeClassName: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  },
  done: {
    title: "Done",
    description: "Finished work that has cleared the workflow.",
    emptyTitle: "No completed tasks yet",
    emptyDescription: "Finished items will show up here once they are marked done.",
    columnClassName: "bg-emerald-50 dark:bg-emerald-950/30",
    accentClassName: "bg-emerald-500 dark:bg-emerald-400",
    badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  failed: {
    title: "Failed",
    description: "Tasks that need intervention before they can continue.",
    emptyTitle: "No failures",
    emptyDescription: "If a run stalls or errors out, it will surface here for recovery.",
    columnClassName: "bg-red-50 dark:bg-red-950/30",
    accentClassName: "bg-red-500 dark:bg-red-400",
    badgeClassName: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};

export const SYMPHONY_PRIORITY_CLASS: Record<SymphonyTaskPriority, string> = {
  low: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export const SYMPHONY_RUN_STATUS_CLASS: Record<SymphonyRunStatus, string> = {
  running: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  cancelled: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

export function parseLabelsInput(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((label) => label.trim())
        .filter((label) => label.length > 0),
    ),
  );
}

export function formatLabelsInput(labels: readonly string[]): string {
  return labels.join(", ");
}
