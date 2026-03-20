/**
 * SymphonyPushService - Effect layer implementation (stub).
 *
 * @module symphony/Layers/SymphonyPushService
 */
import type { SymphonyRun, SymphonyTask } from "@t3tools/contracts";
import { Effect, Layer } from "effect";

import {
  SymphonyPushService,
  type RunEventKind,
  type TaskEventKind,
} from "../Services/SymphonyPushService.ts";

const makeSymphonyPushService = Effect.gen(function* () {
  // TODO: Wire up to ServerPushBus when integrating
  const emitTaskEvent = (_kind: TaskEventKind, _task: SymphonyTask) => Effect.void;
  const emitRunEvent = (_kind: RunEventKind, _run: SymphonyRun, _taskId: SymphonyTask["id"]) =>
    Effect.void;

  return { emitTaskEvent, emitRunEvent } satisfies typeof SymphonyPushService.Service;
});

export const SymphonyPushServiceLive = Layer.effect(SymphonyPushService, makeSymphonyPushService);
