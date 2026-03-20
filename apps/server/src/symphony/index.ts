/**
 * Symphony Module Exports
 *
 * Autonomous orchestration layer for running agent tasks.
 *
 * @module symphony
 */

// Services (interfaces)
export { SymphonyWorkflowLoader } from "./Services/SymphonyWorkflowLoader.ts";
export { SymphonyWorkspaceManager } from "./Services/SymphonyWorkspaceManager.ts";
export { SymphonyAgentRunner } from "./Services/SymphonyAgentRunner.ts";
export { SymphonyOrchestrator } from "./Services/SymphonyOrchestrator.ts";
export { SymphonyPushService } from "./Services/SymphonyPushService.ts";

// Layers (implementations)
export { SymphonyWorkflowLoaderLive } from "./Layers/SymphonyWorkflowLoader.ts";
export { SymphonyWorkspaceManagerLive } from "./Layers/SymphonyWorkspaceManager.ts";
export { SymphonyAgentRunnerLive } from "./Layers/SymphonyAgentRunner.ts";
export { SymphonyOrchestratorLive } from "./Layers/SymphonyOrchestrator.ts";
export { SymphonyPushServiceLive } from "./Layers/SymphonyPushService.ts";

// Combined layer
export { SymphonyLive } from "./Layers/Symphony.ts";

// Errors
export type { SymphonyError } from "./Errors.ts";
export {
  SymphonyWorkflowError,
  SymphonyWorkspaceError,
  SymphonyAgentError,
  SymphonyOrchestrationError,
} from "./Errors.ts";
