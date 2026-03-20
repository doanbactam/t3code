/**
 * SymphonyWorkspaceManager - Effect layer implementation.
 *
 * @module symphony/Layers/SymphonyWorkspaceManager
 */
import type { SymphonyTask } from "@t3tools/contracts";
import { Effect, FileSystem, Layer } from "effect";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

import {
  SymphonyWorkspaceManager,
  type HookResult,
  type WorkspaceInfo,
} from "../Services/SymphonyWorkspaceManager.ts";

const WORKSPACES_DIR = ".symphony/workspaces";

const makeSymphonyWorkspaceManager = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const sanitizeKey = (title: string): string => {
    const sanitized = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    return `${sanitized}-${randomUUID().slice(0, 8)}`;
  };

  const getWorkspacePath = (task: SymphonyTask, projectRoot: string): string => {
    return path.join(projectRoot, WORKSPACES_DIR, task.workspaceKey);
  };

  const createWorkspace = (task: SymphonyTask, projectRoot: string) =>
    Effect.gen(function* () {
      const workspacePath = getWorkspacePath(task, projectRoot);
      const workspacesDir = path.join(projectRoot, WORKSPACES_DIR);

      yield* fs.makeDirectory(workspacesDir, { recursive: true }).pipe(Effect.orDie);
      yield* fs.makeDirectory(workspacePath, { recursive: true }).pipe(Effect.orDie);

      return { path: workspacePath, key: task.workspaceKey } satisfies WorkspaceInfo;
    });

  const runHook = (
    _hookCommand: string,
    _workspacePath: string,
    _task: SymphonyTask,
    _timeoutMs?: number,
  ) =>
    Effect.succeed({
      exitCode: 0,
      stdout: "",
      stderr: "",
    } satisfies HookResult);

  const cleanWorkspace = (task: SymphonyTask, projectRoot: string) =>
    Effect.gen(function* () {
      const workspacePath = getWorkspacePath(task, projectRoot);
      const exists = yield* fs.exists(workspacePath).pipe(Effect.orDie);
      if (!exists) return;
      yield* fs.remove(workspacePath, { recursive: true }).pipe(Effect.orDie);
    });

  const workspaceExists = (task: SymphonyTask, projectRoot: string) =>
    Effect.gen(function* () {
      const workspacePath = getWorkspacePath(task, projectRoot);
      return yield* fs.exists(workspacePath).pipe(Effect.orDie);
    });

  return {
    createWorkspace,
    getWorkspacePath,
    sanitizeKey,
    runHook,
    cleanWorkspace,
    workspaceExists,
  } satisfies typeof SymphonyWorkspaceManager.Service;
});

export const SymphonyWorkspaceManagerLive = Layer.effect(
  SymphonyWorkspaceManager,
  makeSymphonyWorkspaceManager,
);
