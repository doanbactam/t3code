/**
 * SymphonyMetrics
 *
 * Stats bar showing task counts by state.
 */
import { cn } from "~/lib/utils";

interface SymphonyMetricsProps {
  readonly backlogCount: number;
  readonly queuedCount: number;
  readonly runningCount: number;
  readonly reviewCount: number;
  readonly doneCount: number;
  readonly failedCount: number;
}

export function SymphonyMetrics({
  backlogCount,
  queuedCount,
  runningCount,
  reviewCount,
  doneCount,
  failedCount,
}: SymphonyMetricsProps) {
  const total = backlogCount + queuedCount + runningCount + reviewCount + doneCount + failedCount;

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-card px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-0.5">
            <div className="text-xs font-medium text-muted-foreground">Total Tasks</div>
            <div className="text-xl font-semibold text-foreground tabular-nums">{total}</div>
          </div>
          <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <MetricItem label="Backlog" count={backlogCount} color="bg-neutral-400" />
          <MetricItem label="Queued" count={queuedCount} color="bg-blue-500" />
          <MetricItem label="Running" count={runningCount} color="bg-amber-500" highlight />
          <MetricItem label="Review" count={reviewCount} color="bg-violet-500" />
          <MetricItem label="Done" count={doneCount} color="bg-emerald-500" />
          <MetricItem label="Failed" count={failedCount} color="bg-red-500" />
        </div>
      </div>
    </div>
  );
}

interface MetricItemProps {
  readonly label: string;
  readonly count: number;
  readonly color: string;
  readonly highlight?: boolean;
}

function MetricItem({ label, count, color, highlight }: MetricItemProps) {
  return (
    <div className={cn("flex items-center gap-2", highlight && "font-semibold")}>
      <div className={cn("h-3 w-3 rounded-full shadow-sm", color)} />
      <span className="text-neutral-600 dark:text-neutral-400 font-medium">{label}:</span>
      <span className="font-semibold text-foreground tabular-nums">{count}</span>
    </div>
  );
}
