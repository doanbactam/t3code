/**
 * SymphonyPushService - Service interface for Symphony push events.
 *
 * @module SymphonyPushService
 */
import type {
  SymphonyRun,
  SymphonyRunEventPayload,
  SymphonyTask,
  SymphonyTaskEventPayload,
} from "@t3tools/contracts";
import { ServiceMap } from "effect";
import type { Effect } from "effect";

export type TaskEventKind = SymphonyTaskEventPayload["kind"];
export type RunEventKind = SymphonyRunEventPayload["kind"];

export interface SymphonyPushServiceShape {
  readonly emitTaskEvent: (kind: TaskEventKind, task: SymphonyTask) => Effect.Effect<void>;
  readonly emitRunEvent: (
    kind: RunEventKind,
    run: SymphonyRun,
    taskId: SymphonyTask["id"],
  ) => Effect.Effect<void>;
}

export class SymphonyPushService extends ServiceMap.Service<
  SymphonyPushService,
  SymphonyPushServiceShape
>()("t3/symphony/Services/SymphonyPushService") {}
