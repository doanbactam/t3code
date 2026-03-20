/**
 * Symphony Layers - Combined layer for all Symphony services.
 *
 * @module symphony/Layers/Symphony
 */
import { Layer } from "effect";

import { SymphonyWorkflowLoaderLive } from "./SymphonyWorkflowLoader.ts";
import { SymphonyWorkspaceManagerLive } from "./SymphonyWorkspaceManager.ts";
import { SymphonyAgentRunnerLive } from "./SymphonyAgentRunner.ts";
import { SymphonyOrchestratorLive } from "./SymphonyOrchestrator.ts";
import { SymphonyPushServiceLive } from "./SymphonyPushService.ts";

/**
 * Combined layer providing all Symphony services.
 *
 * Dependencies (must be provided):
 * - FileSystem.FileSystem
 * - ProviderService
 * - SymphonyTaskRepository
 * - SymphonyRunRepository
 *
 * Layer ordering:
 * 1. Base: WorkflowLoader, WorkspaceManager, PushService (no Symphony deps)
 * 2. AgentRunner: depends on base services
 * 3. Orchestrator: depends on AgentRunner + base services
 */
export const SymphonyLive = SymphonyOrchestratorLive.pipe(
  Layer.provideMerge(SymphonyAgentRunnerLive),
  Layer.provideMerge(SymphonyWorkflowLoaderLive),
  Layer.provideMerge(SymphonyWorkspaceManagerLive),
  Layer.provideMerge(SymphonyPushServiceLive),
);
