import { describe, expect, it } from "vitest";

import { shouldHideProviderHealthBanner } from "./ProviderHealthBanner";

describe("shouldHideProviderHealthBanner", () => {
  it("hides the banner when provider health is ready", () => {
    expect(
      shouldHideProviderHealthBanner(
        {
          provider: "codex",
          status: "ready",
          available: true,
          authStatus: "authenticated",
          checkedAt: "2026-03-20T00:00:00.000Z",
        },
        null,
      ),
    ).toBe(true);
  });

  it("hides the banner when the active session for that provider is healthy", () => {
    expect(
      shouldHideProviderHealthBanner(
        {
          provider: "codex",
          status: "error",
          available: false,
          authStatus: "unknown",
          checkedAt: "2026-03-20T00:00:00.000Z",
          message: "stale startup failure",
        },
        {
          provider: "codex",
          status: "running",
          createdAt: "2026-03-20T00:00:00.000Z",
          updatedAt: "2026-03-20T00:00:00.000Z",
          orchestrationStatus: "running",
        },
      ),
    ).toBe(true);
  });

  it("keeps the banner when the active session is errored", () => {
    expect(
      shouldHideProviderHealthBanner(
        {
          provider: "codex",
          status: "error",
          available: false,
          authStatus: "unknown",
          checkedAt: "2026-03-20T00:00:00.000Z",
          message: "provider unavailable",
        },
        {
          provider: "codex",
          status: "error",
          createdAt: "2026-03-20T00:00:00.000Z",
          updatedAt: "2026-03-20T00:00:00.000Z",
          orchestrationStatus: "error",
          lastError: "provider unavailable",
        },
      ),
    ).toBe(false);
  });
});
