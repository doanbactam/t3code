/**
 * Symphony Route
 *
 * Route for the Symphony orchestration dashboard.
 */
import { createFileRoute } from "@tanstack/react-router";
import { SymphonyDashboard } from "~/components/symphony";

export const Route = createFileRoute("/_chat/symphony")({
  component: SymphonyPage,
});

function SymphonyPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      <SymphonyDashboard />
    </div>
  );
}
