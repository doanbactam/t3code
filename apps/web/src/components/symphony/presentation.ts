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
    columnClassName: "bg-zinc-50 dark:bg-zinc-900/40",
    badgeClassName: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  queued: {
    title: "Queued",
    columnClassName: "bg-sky-50 dark:bg-sky-950/40",
    badgeClassName: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  },
  running: {
    title: "Running",
    columnClassName: "bg-amber-50 dark:bg-amber-950/40",
    badgeClassName: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  review: {
    title: "Review",
    columnClassName: "bg-violet-50 dark:bg-violet-950/40",
    badgeClassName: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  },
  done: {
    title: "Done",
    columnClassName: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  failed: {
    title: "Failed",
    columnClassName: "bg-rose-50 dark:bg-rose-950/40",
    badgeClassName: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  },
};

export const SYMPHONY_PRIORITY_CLASS: Record<SymphonyTaskPriority, string> = {
  low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  high: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

export const SYMPHONY_RUN_STATUS_CLASS: Record<SymphonyRunStatus, string> = {
  running: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  cancelled: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
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
