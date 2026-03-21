/**
 * SymphonyPushService - Effect layer implementation.
 *
 * Broadcasts run and task lifecycle events to WebSocket clients.
 *
 * ServerPushBus is injected at runtime. The server registers an instance during
 * initialization, allowing this service to emit events without tight coupling.
 *
 * @module symphony/Layers/SymphonyPushService
 */
import type {
  SymphonyRun,
  SymphonyRunEventPayload,
  SymphonyTask,
  SymphonyTaskEventPayload,
} from "@t3tools/contracts";
import { SYMPHONY_WS_CHANNELS } from "@t3tools/contracts";
import { Effect, Layer } from "effect";

import {
  SymphonyPushService,
  type RunEventKind,
  type TaskEventKind,
} from "../Services/SymphonyPushService.ts";
import type { ServerPushBus } from "../../wsServer/pushBus.ts";

/**
 * Global reference to the ServerPushBus instance.
 * Set by the server during initialization (in wsServer.ts createServer).
 * Falls back to null until registered.
 */
let serverPushBusInstance: ServerPushBus | null = null;

/**
 * Register the ServerPushBus for use by SymphonyPushService.
 * Called by the server during initialization.
 */
export const setServerPushBus = (pushBus: ServerPushBus): void => {
  serverPushBusInstance = pushBus;
};

const makeSymphonyPushService = Effect.sync(() => {
  const emitTaskEvent = (kind: TaskEventKind, task: SymphonyTask) =>
    Effect.gen(function* () {
      // Skip emitting if push bus not initialized (e.g., during testing)
      if (!serverPushBusInstance) {
        return;
      }

      const payload: SymphonyTaskEventPayload = { kind, task };
      yield* serverPushBusInstance.publishAll(SYMPHONY_WS_CHANNELS.taskEvent, payload);
    }).pipe(
      Effect.catch((error) => Effect.logWarning(`Failed to emit task event: ${String(error)}`)),
    );

  const emitRunEvent = (kind: RunEventKind, run: SymphonyRun, taskId: SymphonyTask["id"]) =>
    Effect.gen(function* () {
      // Skip emitting if push bus not initialized (e.g., during testing)
      if (!serverPushBusInstance) {
        return;
      }

      const payload: SymphonyRunEventPayload = { kind, run, taskId };
      yield* serverPushBusInstance.publishAll(SYMPHONY_WS_CHANNELS.runEvent, payload);
    }).pipe(
      Effect.catch((error) => Effect.logWarning(`Failed to emit run event: ${String(error)}`)),
    );

  return { emitTaskEvent, emitRunEvent } satisfies typeof SymphonyPushService.Service;
});

export const SymphonyPushServiceLive = Layer.effect(SymphonyPushService, makeSymphonyPushService);
