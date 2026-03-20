/**
 * SymphonyWorkspaceManager - Service interface for task workspace management.
 *
 * @module SymphonyWorkspaceManager
 */
import type { SymphonyTask } from "@t3tools/contracts";
import { ServiceMap } from "effect";
import type { Effect } from "effect";

export interface WorkspaceInfo {
  readonly path: string;
  readonly key: string;
}

export interface HookResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface SymphonyWorkspaceManagerShape {
  readonly createWorkspace: (
    task: SymphonyTask,
    projectRoot: string,
  ) => Effect.Effect<WorkspaceInfo, never>;
  readonly getWorkspacePath: (task: SymphonyTask, projectRoot: string) => string;
  readonly sanitizeKey: (title: string) => string;
  readonly runHook: (
    hookCommand: string,
    workspacePath: string,
    task: SymphonyTask,
    timeoutMs?: number,
  ) => Effect.Effect<HookResult, never>;
  readonly cleanWorkspace: (task: SymphonyTask, projectRoot: string) => Effect.Effect<void, never>;
  readonly workspaceExists: (
    task: SymphonyTask,
    projectRoot: string,
  ) => Effect.Effect<boolean, never>;
}

export class SymphonyWorkspaceManager extends ServiceMap.Service<
  SymphonyWorkspaceManager,
  SymphonyWorkspaceManagerShape
>()("t3/symphony/Services/SymphonyWorkspaceManager") {}
