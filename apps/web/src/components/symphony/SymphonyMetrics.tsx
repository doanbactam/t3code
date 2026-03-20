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
    <div className="flex items-center gap-6 border-b bg-card px-6 py-3">
      <div className="text-sm font-medium">{total} tasks</div>

      <div className="flex items-center gap-4 text-sm">
        <MetricItem label="Backlog" count={backlogCount} color="bg-gray-500" />
        <MetricItem label="Queued" count={queuedCount} color="bg-blue-500" />
        <MetricItem label="Running" count={runningCount} color="bg-yellow-500" highlight />
        <MetricItem label="Review" count={reviewCount} color="bg-purple-500" />
        <MetricItem label="Done" count={doneCount} color="bg-green-500" />
        <MetricItem label="Failed" count={failedCount} color="bg-red-500" />
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
    <div className={cn("flex items-center gap-1.5", highlight && "font-medium")}>
      <div className={cn("h-2 w-2 rounded-full", color)} />
      <span className="text-muted-foreground">{label}:</span>
      <span>{count}</span>
    </div>
  );
}
