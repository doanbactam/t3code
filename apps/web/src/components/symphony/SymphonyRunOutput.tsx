import type { SymphonyRun } from "@t3tools/contracts";
import ChatMarkdown from "~/components/ChatMarkdown";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { formatTimestamp } from "~/timestampFormat";
import { SYMPHONY_RUN_STATUS_CLASS } from "./presentation";

interface SymphonyRunOutputProps {
  readonly run: SymphonyRun | null;
  readonly cwd: string | undefined;
  readonly timestampFormat: "locale" | "12-hour" | "24-hour";
}

export function SymphonyRunOutput({ run, cwd, timestampFormat }: SymphonyRunOutputProps) {
  if (!run) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
        Select a run to inspect prompt, timing, and failure details.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("text-xs", SYMPHONY_RUN_STATUS_CLASS[run.status])}>
          {run.status}
        </Badge>
        <span className="text-xs text-muted-foreground">Attempt #{run.attempt}</span>
        {run.threadId ? (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">thread {run.threadId}</code>
        ) : null}
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>Started: {formatTimestamp(run.startedAt, timestampFormat)}</div>
        <div>
          Completed:{" "}
          {run.completedAt ? formatTimestamp(run.completedAt, timestampFormat) : "In progress"}
        </div>
      </div>

      {run.tokenUsage ? (
        <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground text-xs">Prompt tokens</div>
            <div className="font-medium">{run.tokenUsage.prompt}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Completion tokens</div>
            <div className="font-medium">{run.tokenUsage.completion}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Total tokens</div>
            <div className="font-medium">{run.tokenUsage.total}</div>
          </div>
        </div>
      ) : null}

      {run.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="font-medium text-rose-700 text-sm dark:text-rose-300">Run error</div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-sm text-rose-700 dark:text-rose-200">
            {run.error}
          </pre>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="font-medium text-sm">Rendered prompt</div>
        <div className="rounded-lg border bg-background p-4">
          <ChatMarkdown text={run.prompt} cwd={cwd} isStreaming={run.status === "running"} />
        </div>
      </div>
    </div>
  );
}
