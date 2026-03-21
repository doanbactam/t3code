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
  const actionableCount = backlogCount + queuedCount + runningCount + reviewCount + failedCount;
  const completionRate = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div className="border-b border-neutral-200 bg-card/95 px-6 py-4 backdrop-blur dark:border-neutral-800">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,2fr)]">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTile
            label="Total Tasks"
            value={total}
            hint={
              total === 0
                ? "Create your first Symphony task to get the board moving."
                : "Across every lane"
            }
          />
          <SummaryTile
            label="In Flight"
            value={actionableCount}
            hint="Needs automation or human attention"
          />
          <SummaryTile
            label="Completion"
            value={`${completionRate}%`}
            hint={`${doneCount} finished`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-neutral-200/80 bg-background/80 px-4 py-3 dark:border-neutral-800">
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

interface SummaryTileProps {
  readonly label: string;
  readonly value: number | string;
  readonly hint: string;
}

function SummaryTile({ label, value, hint }: SummaryTileProps) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-background/80 px-4 py-3 shadow-sm dark:border-neutral-800">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
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
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-2 py-1",
        highlight && "bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", color)} />
      <span className="font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="font-semibold text-foreground tabular-nums">{count}</span>
    </div>
  );
}
