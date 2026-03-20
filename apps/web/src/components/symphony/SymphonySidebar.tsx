/**
 * SymphonySidebar
 *
 * Sidebar navigation for Symphony views.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, LayoutGrid } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useSymphonyStore, selectActiveRuns } from "~/symphonyStore";

export function SymphonySidebar() {
  const navigate = useNavigate();
  const activeRuns = useSymphonyStore(selectActiveRuns);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold">Symphony</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            void navigate({ to: "/symphony" });
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("symphony:create-task"));
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-2">
          <Link
            to="/symphony"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
            activeProps={{ className: "bg-accent" }}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Board</span>
          </Link>
        </nav>
      </ScrollArea>

      {activeRuns.length > 0 && (
        <div className="border-t p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span>{activeRuns.length} running</span>
          </div>
        </div>
      )}
    </div>
  );
}
