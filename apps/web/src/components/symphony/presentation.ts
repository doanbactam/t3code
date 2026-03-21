import type {
  SymphonyRunStatus,
  SymphonyTaskPriority,
  SymphonyTaskState,
} from "@t3tools/contracts";

export const SYMPHONY_STATE_META: Record<
  SymphonyTaskState,
  {
    readonly title: string;
    readonly columnClassName: string;
    readonly badgeClassName: string;
  }
> = {
  backlog: {
    title: "Backlog",
    columnClassName: "bg-neutral-50 dark:bg-neutral-900/30",
    badgeClassName: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  queued: {
    title: "Queued",
    columnClassName: "bg-blue-50 dark:bg-blue-950/30",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  running: {
    title: "Running",
    columnClassName: "bg-amber-50 dark:bg-amber-950/30",
    badgeClassName: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  review: {
    title: "Review",
    columnClassName: "bg-violet-50 dark:bg-violet-950/30",
    badgeClassName: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  },
  done: {
    title: "Done",
    columnClassName: "bg-emerald-50 dark:bg-emerald-950/30",
    badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  failed: {
    title: "Failed",
    columnClassName: "bg-red-50 dark:bg-red-950/30",
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
