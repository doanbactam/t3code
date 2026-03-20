import type { SymphonyRun, SymphonyRunId } from "@t3tools/contracts";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { formatTimestamp } from "~/timestampFormat";
import { SYMPHONY_RUN_STATUS_CLASS } from "./presentation";

interface SymphonyRunHistoryProps {
  readonly runs: SymphonyRun[];
  readonly selectedRunId: SymphonyRunId | null;
  readonly timestampFormat: "locale" | "12-hour" | "24-hour";
  readonly onSelectRun: (runId: SymphonyRunId) => void;
}

export function SymphonyRunHistory({
  runs,
  selectedRunId,
  timestampFormat,
  onSelectRun,
}: SymphonyRunHistoryProps) {
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
        No runs yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const isSelected = run.id === selectedRunId;

        return (
          <button
            key={run.id}
            type="button"
            className={cn(
              "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/40",
              isSelected && "border-primary bg-accent/40",
            )}
            onClick={() => onSelectRun(run.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-sm">Attempt #{run.attempt}</div>
              <Badge
                variant="outline"
                className={cn("text-xs", SYMPHONY_RUN_STATUS_CLASS[run.status])}
              >
                {run.status}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatTimestamp(run.startedAt, timestampFormat)}
            </div>
            {run.error ? (
              <div className="mt-2 line-clamp-2 text-xs text-rose-600 dark:text-rose-300">
                {run.error}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
