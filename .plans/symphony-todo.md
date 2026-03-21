# Symphony Integration — TODO Checklist

## Phase 1: Foundation ✅ COMPLETE

### Contracts ✅
- [x] Create `packages/contracts/src/symphony.ts`
  - [x] `SymphonyTaskId` branded string schema
  - [x] `SymphonyTaskState` literal union schema
  - [x] `SymphonyTaskPriority` literal union schema
  - [x] `SymphonyTask` struct schema
  - [x] `SymphonyRunId` branded string schema
  - [x] `SymphonyRunStatus` literal union schema
  - [x] `SymphonyRun` struct schema
  - [x] `SymphonyWorkflowConfig` struct schema (YAML front matter)
  - [x] `SymphonyWorkflow` struct schema (config + prompt)
  - [x] Client command input schemas (Create, Update, Move, Delete, Retry, Stop)
  - [x] Event payload schemas (TaskEvent, RunEvent)
  - [x] RPC schema map (`SymphonyRpcSchemas`)
  - [x] Orchestrator control schemas (Start, Stop, GetStatus)
- [x] Extend `packages/contracts/src/ws.ts`
  - [x] Add `symphony.*` methods to `WS_METHODS`
  - [x] Add `symphony.*` channels to `WS_CHANNELS`
  - [x] Add Symphony method schemas to `WsRpcSchemas`
  - [x] Add Symphony push schemas to `WsPushSchemas`
- [x] Re-export symphony from `packages/contracts/src/index.ts`
- [x] Run `bun typecheck` — passes

### Persistence ✅
- [x] Create `apps/server/src/persistence/Migrations/016_SymphonyTasks.ts`
  - [x] `symphony_tasks` table with indexes
- [x] Create `apps/server/src/persistence/Migrations/017_SymphonyRuns.ts`
  - [x] `symphony_runs` table with indexes
- [x] Register migrations in `apps/server/src/persistence/Migrations.ts`
- [x] Create `apps/server/src/persistence/Services/SymphonyTaskStore.ts`
- [x] Create `apps/server/src/persistence/Services/SymphonyRunStore.ts`
- [x] Create `apps/server/src/persistence/Layers/SymphonyTaskStore.ts`
- [x] Create `apps/server/src/persistence/Layers/SymphonyRunStore.ts`
- [x] Write unit tests for SymphonyTaskStore (9 tests)
- [x] Write unit tests for SymphonyRunStore (10 tests)
- [x] Run `bun run test` — passes (19/19 tests)

---

## Phase 2: Core Engine ✅ COMPLETE

### Services ✅
- [x] `apps/server/src/symphony/Errors.ts` — Error types
- [x] `apps/server/src/symphony/Services/SymphonyWorkflowLoader.ts`
- [x] `apps/server/src/symphony/Services/SymphonyWorkspaceManager.ts`
- [x] `apps/server/src/symphony/Services/SymphonyAgentRunner.ts`
- [x] `apps/server/src/symphony/Services/SymphonyOrchestrator.ts`
- [x] `apps/server/src/symphony/Services/SymphonyPushService.ts`

### Layers ✅
- [x] `apps/server/src/symphony/Layers/SymphonyWorkflowLoader.ts`
- [x] `apps/server/src/symphony/Layers/SymphonyWorkspaceManager.ts`
- [x] `apps/server/src/symphony/Layers/SymphonyAgentRunner.ts`
- [x] `apps/server/src/symphony/Layers/SymphonyOrchestrator.ts`
- [x] `apps/server/src/symphony/Layers/SymphonyPushService.ts`
- [x] `apps/server/src/symphony/index.ts` — Module exports

### Typecheck ✅
- [x] `bun typecheck` — passes

---

## Phase 3: UI ✅ COMPLETE

### State & Transport ✅
- [x] Create `apps/web/src/symphonyStore.ts`
- [x] Create `apps/web/src/symphonyApi.ts`

### Routing ✅
- [x] Add `/symphony` route (`apps/web/src/routes/symphony.tsx`)

### Components ✅
- [x] `SymphonyDashboard.tsx`
- [x] `SymphonyBoard.tsx`
- [x] `SymphonyColumn.tsx`
- [x] `SymphonyTaskCard.tsx`
- [x] `SymphonyMetrics.tsx`
- [x] `SymphonySidebar.tsx`
- [x] `SymphonyTaskForm.tsx` (create/edit task dialog)
- [x] `SymphonyTaskDetail.tsx` (task detail panel)
- [x] `SymphonyRunOutput.tsx` (run output viewer)
- [x] `SymphonyRunHistory.tsx` (run history panel)

### Server Wiring ✅
- [x] Add SymphonyTaskRepositoryLive to serverLayers.ts
- [x] Add SymphonyRunRepositoryLive to serverLayers.ts
- [x] Add SymphonyLive to serverLayers.ts
- [x] Add symphony API to wsNativeApi.ts
- [x] Add symphony types to NativeApi interface in contracts/ipc.ts

### Sidebar ✅
- [x] Add Symphony link to Sidebar footer

### Drag and Drop ✅
- [x] Add @dnd-kit/core, @dnd-kit/utilities packages
- [x] Implement drag between columns in SymphonyBoard

---

## Phase 4: Polish & Hardening ✅ COMPLETE

### Recovery ✅
- [x] Server restart recovery (`recoverFromRestart` method in SymphonyOrchestrator)
- [x] Wire `recoverFromRestart()` call in wsServer.ts on startup

### Timeouts & Stall Detection ✅
- [x] Implement stall detection (already in `checkStalledRuns`)
- [x] Implement turn timeout (via `turnTimeoutMs` config)

### Retry Logic ✅
- [x] Exponential backoff calculator (in `processRetryQueue`)
- [x] Max retry limit (via `maxRetries` config)

### WS Handlers ✅
- [x] Add Symphony WS handlers in wsServer.ts
- [x] Add SymphonyTaskId import for proper ID generation
- [x] Wire push events for all mutations (taskEvent, runEvent channels)

### Client Optimization ✅
- [x] Fix N+1 hydration issue (use Promise.all for run history)
- [x] Remove unused `persist` import from symphonyStore.ts

### Documentation ✅
- [x] Create `.docs/symphony.md`
- [x] Update `AGENTS.md` with Symphony reference

---

## Phase 5: Orchestrator Integration ✅ COMPLETE

### Contracts ✅
- [x] Add `startOrchestrator` WS method
- [x] Add `stopOrchestrator` WS method
- [x] Add `getOrchestratorStatus` WS method
- [x] Add `SymphonyOrchestratorStatus` schema
- [x] Add `SymphonyStartOrchestratorInput` schema

### Server ✅
- [x] Add `symphonyStartOrchestrator` handler in wsServer.ts
- [x] Add `symphonyStopOrchestrator` handler in wsServer.ts
- [x] Add `symphonyGetOrchestratorStatus` handler in wsServer.ts

### Client ✅
- [x] Add orchestrator methods to wsNativeApi.ts
- [x] Add orchestrator state to symphonyStore.ts
- [x] Add Start/Stop button to SymphonyDashboard.tsx
- [x] Poll orchestrator status every 3 seconds
- [x] Display running task count in header

### Cross-linking (future enhancement)
- [ ] Link task ↔ thread (optional)

---

## Summary

| Phase | Status |
|-------|--------|
| Phase 1: Foundation | ✅ COMPLETE |
| Phase 2: Core Engine | ✅ COMPLETE |
| Phase 3: UI | ✅ COMPLETE |
| Phase 4: Polish & Hardening | ✅ COMPLETE |
| Phase 5: Orchestrator Integration | ✅ COMPLETE |

**Symphony Integration is feature-complete!** 🎉

_Last updated: 2026-03-21_
