/**
 * SymphonyOrchestrator - Service interface for task orchestration.
 *
 * @module SymphonyOrchestrator
 */
import type { ProjectId, SymphonyRun, SymphonyTaskId } from "@t3tools/contracts";
import { ServiceMap } from "effect";
import type { Effect } from "effect";

import type { SymphonyError } from "../Errors.ts";
import type { ProjectionRepositoryError } from "../../persistence/Errors.ts";

export interface OrchestratorStatus {
  readonly isRunning: boolean;
  readonly activeRunCount: number;
  readonly maxConcurrency: number;
  readonly retryQueueSize: number;
}

export interface ProjectOrchestratorConfig {
  readonly projectId: ProjectId;
  readonly projectRoot: string;
  readonly maxConcurrency?: number;
  readonly maxRetries?: number;
  readonly maxRetryBackoffMs?: number;
  readonly turnTimeoutMs?: number;
  readonly stallTimeoutMs?: number;
}

export interface RetryEntry {
  readonly task: {
    readonly id: SymphonyTaskId;
    readonly runCount: number;
  };
  readonly retryAt: number;
  readonly attempt: number;
}

export interface SymphonyOrchestratorShape {
  readonly start: (
    config: ProjectOrchestratorConfig,
  ) => Effect.Effect<void, SymphonyError | ProjectionRepositoryError>;
  readonly stop: (projectId: ProjectId) => Effect.Effect<void>;
  readonly getStatus: (projectId: ProjectId) => Effect.Effect<OrchestratorStatus>;
  readonly getActiveRuns: () => Effect.Effect<
    ReadonlyArray<SymphonyRun>,
    ProjectionRepositoryError
  >;
  readonly tick: (
    projectId: ProjectId,
  ) => Effect.Effect<void, SymphonyError | ProjectionRepositoryError>;
  readonly checkStalledRuns: (
    projectId: ProjectId,
  ) => Effect.Effect<ReadonlyArray<SymphonyRun>, ProjectionRepositoryError>;
  readonly processRetryQueue: (
    projectId: ProjectId,
  ) => Effect.Effect<void, ProjectionRepositoryError>;
  readonly recoverFromRestart: () => Effect.Effect<
    { readonly recoveredCount: number },
    ProjectionRepositoryError
  >;
}

export class SymphonyOrchestrator extends ServiceMap.Service<
  SymphonyOrchestrator,
  SymphonyOrchestratorShape
>()("t3/symphony/Services/SymphonyOrchestrator") {}
