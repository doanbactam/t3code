import readline from "node:readline";

import { ApprovalRequestId, type ThreadId, type ProviderSession } from "@t3tools/contracts";

import type {
  CodexAccountSnapshot,
  CodexSessionContext,
  PendingApprovalRequest,
  PendingRequest,
  PendingRequestKey,
  PendingUserInputRequest,
} from "./types";

// ============================================================================
// Session Context Management
// ============================================================================

export function createCodexSessionContext(
  session: ProviderSession,
  child: CodexSessionContext["child"],
): CodexSessionContext {
  const output = readline.createInterface({ input: child.stdout });

  return {
    session,
    account: {
      type: "unknown",
      planType: null,
      sparkEnabled: true,
    },
    child,
    output,
    pending: new Map<PendingRequestKey, PendingRequest>(),
    pendingApprovals: new Map<ApprovalRequestId, PendingApprovalRequest>(),
    pendingUserInputs: new Map<ApprovalRequestId, PendingUserInputRequest>(),
    collabReceiverTurns: new Map<string, CodexSessionContext["collabReceiverTurns"] extends Map<string, infer T> ? T : never>(),
    nextRequestId: 1,
    stopping: false,
  };
}

export function updateSessionAccount(
  context: CodexSessionContext,
  account: CodexAccountSnapshot,
): void {
  (context as { account: CodexAccountSnapshot }).account = account;
}

export function clearPendingRequests(context: CodexSessionContext): void {
  for (const pending of context.pending.values()) {
    clearTimeout(pending.timeout);
    pending.reject(new Error("Session stopped before request completed."));
  }
  context.pending.clear();
  context.pendingApprovals.clear();
  context.pendingUserInputs.clear();
}

export function closeSessionOutput(context: CodexSessionContext): void {
  context.output.close();
}

// ============================================================================
// Resume Cursor Helpers
// ============================================================================

export function readResumeCursorThreadId(resumeCursor: unknown): string | undefined {
  if (!resumeCursor || typeof resumeCursor !== "object" || Array.isArray(resumeCursor)) {
    return undefined;
  }
  const rawThreadId = (resumeCursor as Record<string, unknown>).threadId;
  return typeof rawThreadId === "string" ? normalizeProviderThreadId(rawThreadId) : undefined;
}

function normalizeProviderThreadId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized?.length ? normalized : undefined;
}
