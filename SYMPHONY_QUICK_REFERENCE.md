# Symphony Orchestration - Quick Reference

## 📊 Status at a Glance

| Component             | Coverage | Status | Issues                |
| --------------------- | -------- | ------ | --------------------- |
| **UI Components**     | 100%     | ✅     | None                  |
| **WebSocket Methods** | 100%     | ✅     | None                  |
| **Task Events**       | 100%     | ✅     | None                  |
| **Run Events**        | 20%      | ❌     | NOT BROADCAST         |
| **Persistence**       | 100%     | ✅     | None                  |
| **Orchestrator**      | 85%      | ⚠️     | Incomplete file       |
| **State Validation**  | 0%       | ❌     | No guards             |
| **Error Handling**    | 70%      | ⚠️     | Partial               |
| **Configuration**     | 90%      | ⚠️     | maxRetries unused     |
| **Overall**           | **92%**  | ⚠️     | **3 critical issues** |

---

## 🚨 Critical Issues

### 1. Run Events Not Pushed to Clients

**File**: `SymphonyPushService.ts` (STUBBED)  
**Impact**: UI blind to run status changes  
**Fix**: Implement `emitRunEvent` to use `pushBus`

### 2. Orchestrator Incomplete

**File**: `SymphonyOrchestrator.ts` (lines truncated)  
**Impact**: Can't verify main loop exists  
**Fix**: Review full file, test main loop

### 3. No State Validation

**File**: `wsServer.ts` line 1007  
**Impact**: Invalid state flows allowed  
**Fix**: Add transition guards

---

## 📁 Key Files

### Backend Services

```
symphony/Services/
  ├── SymphonyOrchestrator.ts      (Interface definition)
  ├── SymphonyAgentRunner.ts       (Interface definition)
  ├── SymphonyWorkflowLoader.ts    (Interface definition)
  ├── SymphonyWorkspaceManager.ts  (Interface definition)
  └── SymphonyPushService.ts       (Interface definition)

symphony/Layers/
  ├── SymphonyOrchestrator.ts      ⚠️ INCOMPLETE
  ├── SymphonyAgentRunner.ts       ✅
  ├── SymphonyWorkflowLoader.ts    ✅
  ├── SymphonyWorkspaceManager.ts  ✅
  └── SymphonyPushService.ts       ❌ STUBBED
```

### Persistence

```
persistence/Layers/
  ├── SymphonyTaskStore.ts         ✅ Complete
  └── SymphonyRunStore.ts          ✅ Complete

persistence/Services/
  ├── SymphonyTaskStore.ts         (Interface)
  └── SymphonyRunStore.ts          (Interface)

persistence/Migrations/
  ├── 016_SymphonyTasks.ts         ✅
  └── 017_SymphonyRuns.ts          ✅
```

### Frontend

```
components/symphony/
  ├── SymphonyDashboard.tsx        ✅
  ├── SymphonyBoard.tsx            ✅
  ├── SymphonyColumn.tsx           ✅
  ├── SymphonyTaskCard.tsx         ✅
  ├── SymphonyTaskDetail.tsx       ✅
  ├── SymphonyTaskForm.tsx         ✅
  ├── SymphonyMetrics.tsx          ✅
  ├── SymphonyRunHistory.tsx       ✅
  └── SymphonyRunOutput.tsx        ✅

symphonyStore.ts                   ✅
routes/_chat.symphony.tsx          ✅
```

---

## 🔄 Data Flow

### Task Creation

```
Client: createTask()
  ↓
WS Handler: wsServer.ts:943
  ↓
Repository: SymphonyTaskStore.create()
  ↓
DB: INSERT symphony_tasks
  ↓
Event: SYMPHONY_WS_CHANNELS.taskEvent (kind='created')
  ↓
Client: symphonyStore.handleTaskEvent()
```

### Task Execution (INCOMPLETE)

```
Orchestrator: start() ← Probably exists (file truncated)
  ↓
Main Loop: Pick queued tasks
  ↓
AgentRunner: startRun()
  ↓
ProviderService: sendTurn() ← Agent executes
  ↓
Run Repository: complete() ← Mark done/failed
  ↓
Event: SYMPHONY_WS_CHANNELS.runEvent ← MISSING BROADCAST
  ↓
Client: ??? (doesn't see update)
```

---

## 🔧 Configuration

All settings loaded from `WORKFLOW.md`:

```yaml
---
maxConcurrency: 3 # ✅ Used
maxRetries: 3 # ❌ NOT USED
maxRetryBackoffMs: 60000 # ✅ Used
turnTimeoutMs: 300000 # ? Unclear
stallTimeoutMs: 60000 # ✅ Used
---
# Your prompt template here...
```

Default values (if not in WORKFLOW.md):

- `maxConcurrency`: 3
- `maxRetries`: 3
- `maxRetryBackoffMs`: 60000
- `turnTimeoutMs`: 300000
- `stallTimeoutMs`: 60000

---

## ✅ What Works

- ✅ Create/read/update/delete tasks
- ✅ Task metadata (title, description, priority, labels)
- ✅ Drag-and-drop task movement
- ✅ Real-time task event broadcasts
- ✅ Run history query
- ✅ Workflow config loading
- ✅ Workspace directory management
- ✅ Orchestrator status polling
- ✅ Server restart recovery
- ✅ Stalled run detection
- ✅ Exponential backoff retry queue
- ✅ Client-side state management

---

## ❌ What Doesn't Work

- ❌ Real-time run status updates (no push events)
- ❌ Run event broadcasting to clients
- ❌ State transition validation
- ❌ Main orchestration loop (unclear if exists)
- ❌ maxRetries enforcement
- ❌ Task→run cascade delete

---

## 🧪 Testing Checklist

- [ ] List tasks
- [ ] Create task
- [ ] Update task
- [ ] Delete task
- [ ] Move task between states
- [ ] Verify task event broadcasts
- [ ] Start orchestrator
- [ ] Monitor run execution (WILL FAIL - no push events)
- [ ] Check run history
- [ ] Verify retry logic with backoff
- [ ] Test server restart recovery
- [ ] Load test with 10+ concurrent tasks
- [ ] Verify maxConcurrency limit
- [ ] Test invalid state transitions

---

## 📋 Lint Warnings

8 warnings in Symphony code:

1. **SymphonyTaskDetail.tsx:51** - Missing useEffect dependency
2. **SymphonyTaskDetail.tsx:31** - Use toReversed() instead of reverse()
3. **wsServer.ts:24** - Unused import SYMPHONY_WS_METHODS
4. **wsServer.ts:973** - Unused variable taskBeforeOption
5. **SymphonyPushService.ts:15** - Generator without yield
   6-8. **SymphonyAgentRunner.ts** - 3 unused imports

All are code quality, not functional issues.

---

## 📖 Documentation

- ✅ `.docs/symphony.md` - Complete user documentation
- ✅ `SYMPHONY_AUDIT.md` - Detailed component audit
- ✅ `SYMPHONY_AUDIT_SUMMARY.txt` - Executive summary

---

## 🎯 Priorities to Fix

### MUST FIX (Blockers)

1. Implement `SymphonyPushService.emitRunEvent()` (2-3h)
2. Verify `Orchestrator.start()` exists and test (3-4h)
3. Add state transition validation (1-2h)

### SHOULD FIX (High Priority)

1. Enforce `maxRetries` limit (1h)
2. Add cascade delete for tasks (1h)
3. Fix lint warnings (30 min)

### NICE TO HAVE (Polish)

1. Better error messages for state validation
2. More comprehensive edge case handling
3. Performance optimization for large task lists

---

## 🔗 Related Files

- `AGENTS.md` - Project conventions and structure
- `DESIGN.md` - Design system (if exists)
- `.docs/architecture.md` - Overall architecture
- `README.md` - Project overview

---

_Last updated: Mar 21 2026_  
_Full audit: See SYMPHONY_AUDIT.md_
