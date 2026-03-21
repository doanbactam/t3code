import { type ServerProviderStatus } from "@t3tools/contracts";
import { memo } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { CircleAlertIcon } from "lucide-react";
import type { ThreadSession } from "~/types";

export function shouldHideProviderHealthBanner(
  status: ServerProviderStatus | null,
  activeSession: ThreadSession | null,
): boolean {
  if (!status || status.status === "ready") {
    return true;
  }

  if (!activeSession || activeSession.provider !== status.provider) {
    return false;
  }

  return (
    activeSession.status !== "error" &&
    activeSession.status !== "closed" &&
    activeSession.lastError === undefined
  );
}

export const ProviderHealthBanner = memo(function ProviderHealthBanner({
  status,
  activeSession,
}: {
  status: ServerProviderStatus | null;
  activeSession: ThreadSession | null;
}) {
  if (shouldHideProviderHealthBanner(status, activeSession)) {
    return null;
  }

  if (!status) {
    return null;
  }

  const providerLabel =
    status.provider === "codex"
      ? "Codex"
      : status.provider === "claudeAgent"
        ? "Claude"
        : status.provider;
  const defaultMessage =
    status.status === "error"
      ? `${providerLabel} provider is unavailable.`
      : `${providerLabel} provider has limited availability.`;
  const title = providerLabel === "Codex" ? "Codex provider status" : `${providerLabel} status`;

  return (
    <div className="pt-3 mx-auto max-w-3xl">
      <Alert variant={status.status === "error" ? "error" : "warning"}>
        <CircleAlertIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="line-clamp-3" title={status.message ?? defaultMessage}>
          {status.message ?? defaultMessage}
        </AlertDescription>
      </Alert>
    </div>
  );
});
