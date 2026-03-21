import type { CodexPlanType } from "./types";

// ============================================================================
// Timeouts
// ============================================================================

export const CODEX_VERSION_CHECK_TIMEOUT_MS = 4_000;

// ============================================================================
// ANSI & Log Patterns
// ============================================================================

export const ANSI_ESCAPE_CHAR = String.fromCharCode(27);
export const ANSI_ESCAPE_REGEX = new RegExp(`${ANSI_ESCAPE_CHAR}\\[[0-9;]*m`, "g");
export const CODEX_STDERR_LOG_REGEX =
  /^\d{4}-\d{2}-\d{2}T\S+\s+(TRACE|DEBUG|INFO|WARN|ERROR)\s+\S+:\s+(.*)$/;

// ============================================================================
// Error Handling
// ============================================================================

export const BENIGN_ERROR_LOG_SNIPPETS = [
  "state db missing rollout path for thread",
  "state db record_discrepancy: find_thread_path_by_id_str_in_subdir, falling_back",
];

export const RECOVERABLE_THREAD_RESUME_ERROR_SNIPPETS = [
  "not found",
  "missing thread",
  "no such thread",
  "unknown thread",
  "does not exist",
];

// ============================================================================
// Model Configuration
// ============================================================================

export const CODEX_DEFAULT_MODEL = "gpt-5.3-codex";
export const CODEX_SPARK_MODEL = "gpt-5.3-codex-spark";
export const CODEX_SPARK_DISABLED_PLAN_TYPES = new Set<CodexPlanType>(["free", "go", "plus"]);
