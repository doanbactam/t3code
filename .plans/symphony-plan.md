# Symphony Integration — Technical Plan

## Architecture Overview

Symphony integration adds an **autonomous orchestration layer** alongside the existing interactive chat system. Both modes share the same `codexAppServerManager` and event sourcing infrastructure.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                     │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  ChatView         │  │  SymphonyDashboard               │ │
│  │  (interactive)    │  │  Board → TaskCard → TaskDetail   │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└──────────┬──────────────────────────┬───────────────────────┘
           │ ws (existing)            │ ws (symphony.*)
┌──────────▼──────────────────────────▼───────────────────────┐
│  apps/server (Node.js)                                      │
│  ┌───────────────────┐  ┌─────────────────────────────────┐ │
│  │  OrchestrationEng  │  │  SymphonyOrchestrator           │ │
│  │  ProviderService   │  │  SymphonyTaskStore (SQLite)     │ │
│  │  (interactive)     │  │  SymphonyWorkflowLoader         │ │
│  │                    │  │  SymphonyAgentRunner             │ │
│  └────────┬───────────┘  └────────┬────────────────────────┘ │
│           │                       │                          │
│  ┌────────▼───────────────────────▼────────────────────────┐ │
│  │  codexAppServerManager (shared)                          │ │
│  └────────┬─────────────────────────────────────────────── ┘ │
└───────────┼──────────────────────────────────────────────────┘
            │ JSON-RPC over stdio
┌───────────▼──────────────────────────────────────────────────┐
│  codex app-server                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Contracts & Schemas

### 1.1 New file: `packages/contracts/src/symphony.ts`

Define all Symphony domain schemas using effect/Schema (matching existing patterns):

```typescript
// Task domain
SymphonyTaskId          // branded string
SymphonyTaskState       // "backlog" | "queued" | "running" | "review" | "done" | "failed"
SymphonyTaskPriority    // "low" | "medium" | "high"
SymphonyTask            // full task schema
SymphonyRunId           // branded string
SymphonyRunStatus       // "running" | "completed" | "failed" | "cancelled"
SymphonyRun             // run attempt schema

// Workflow domain
SymphonyWorkflowConfig  // parsed YAML front matter
SymphonyWorkflow        // config + prompt_template

// Commands (client → server)
SymphonyCreateTaskInput
SymphonyUpdateTaskInput
SymphonyMoveTaskInput
SymphonyDeleteTaskInput
SymphonyRetryTaskInput
SymphonyStopTaskInput
SymphonyGetRunHistoryInput

// Events (server → client push)
SymphonyTaskEvent       // task CRUD + state changes
SymphonyRunEvent        // run lifecycle events
SymphonyRunStreamEvent  // live agent output
```

### 1.2 Extend: `packages/contracts/src/ws.ts`

Add Symphony WS methods and push channels to existing constants:

```typescript
// In WS_METHODS:
symphonyListTasks: "symphony.listTasks",
symphonyCreateTask: "symphony.createTask",
symphonyUpdateTask: "symphony.updateTask",
symphonyDeleteTask: "symphony.deleteTask",
symphonyMoveTask: "symphony.moveTask",
symphonyRetryTask: "symphony.retryTask",
symphonyStopTask: "symphony.stopTask",
symphonyGetRunHistory: "symphony.getRunHistory",
symphonyGetWorkflow: "symphony.getWorkflow",

// In WS_CHANNELS:
symphonyTaskEvent: "symphony.taskEvent",
symphonyRunEvent: "symphony.runEvent",
```

### 1.3 Re-export from `packages/contracts/src/index.ts`

---

## Phase 2: Server — Persistence

### 2.1 New migration: `016_SymphonyTasks.ts`

```sql
CREATE TABLE symphony_tasks (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  state         TEXT NOT NULL DEFAULT 'backlog',
  priority      TEXT NOT NULL DEFAULT 'medium',
  labels        TEXT NOT NULL DEFAULT '[]',  -- JSON array
  workspace_key TEXT NOT NULL,
  current_run_id TEXT,
  run_count     INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projection_projects(id)
);

CREATE INDEX idx_symphony_tasks_project_state ON symphony_tasks(project_id, state);
CREATE INDEX idx_symphony_tasks_state_priority ON symphony_tasks(state, priority, created_at);
```

### 2.2 New migration: `017_SymphonyRuns.ts`

```sql
CREATE TABLE symphony_runs (
  id            TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL,
  thread_id     TEXT,          -- links to orchestration thread
  attempt       INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'running',
  prompt        TEXT NOT NULL,
  error         TEXT,
  token_usage   TEXT,          -- JSON { prompt, completion, total }
  started_at    TEXT NOT NULL,
  completed_at  TEXT,
  FOREIGN KEY (task_id) REFERENCES symphony_tasks(id)
);

CREATE INDEX idx_symphony_runs_task ON symphony_runs(task_id);
```

### 2.3 New persistence service: `SymphonyTaskStore.ts`

Location: `apps/server/src/persistence/Services/SymphonyTaskStore.ts`

Effect service following existing patterns (`ProjectionProjects.ts` as reference):

```typescript
class SymphonyTaskStore extends Context.Tag("SymphonyTaskStore") {
  listByProject(projectId: ProjectId): Effect<SymphonyTask[]>
  getById(id: SymphonyTaskId): Effect<SymphonyTask>
  create(input: CreateTaskInput): Effect<SymphonyTask>
  update(id: SymphonyTaskId, input: UpdateTaskInput): Effect<SymphonyTask>
  delete(id: SymphonyTaskId): Effect<void>
  moveState(id: SymphonyTaskId, newState: SymphonyTaskState): Effect<SymphonyTask>
  findCandidates(projectId: ProjectId, limit: number): Effect<SymphonyTask[]>
    // WHERE state = 'queued' ORDER BY priority DESC, created_at ASC
}
```

### 2.4 New persistence service: `SymphonyRunStore.ts`

```typescript
class SymphonyRunStore extends Context.Tag("SymphonyRunStore") {
  create(input: CreateRunInput): Effect<SymphonyRun>
  complete(id: SymphonyRunId, result: RunResult): Effect<SymphonyRun>
  listByTask(taskId: SymphonyTaskId): Effect<SymphonyRun[]>
  getActive(): Effect<SymphonyRun[]>
}
```

---

## Phase 3: Server — Symphony Core

### 3.1 `apps/server/src/symphony/SymphonyWorkflowLoader.ts`

- Read `WORKFLOW.md` from project root
- Parse YAML front matter → `SymphonyWorkflowConfig`
- Extract prompt body → `prompt_template`
- Watch for file changes → re-parse (using `fs.watch`)
- Apply defaults for missing config values

### 3.2 `apps/server/src/symphony/SymphonyWorkspaceManager.ts`

- Create per-task workspace directories
- Sanitize task title → workspace key (replace non-alphanumeric with `_`)
- Run lifecycle hooks (after_create, before_run, after_run, before_remove)
- Clean up workspaces for completed/deleted tasks

### 3.3 `apps/server/src/symphony/SymphonyAgentRunner.ts`

- Render prompt template with task variables (Mustache-style `{{ task.title }}`)
- Create provider session via existing `ProviderService` / `codexAppServerManager`
- Forward agent events to `SymphonyRunStore` and WebSocket push
- Handle turn completion → update task state
- Handle turn failure → trigger retry logic

### 3.4 `apps/server/src/symphony/SymphonyOrchestrator.ts`

Core orchestration loop (Effect-based fiber):

```typescript
class SymphonyOrchestrator extends Context.Tag("SymphonyOrchestrator") {
  // Lifecycle
  start(): Effect<void>   // begin poll loop
  stop(): Effect<void>    // graceful shutdown

  // Internal loop (private)
  // tick():
  //   1. Query candidateTasks from SymphonyTaskStore (state=queued)
  //   2. Check concurrency limit (activeRuns < maxConcurrency)
  //   3. For each eligible task:
  //      a. Create workspace
  //      b. Run before_run hook
  //      c. Start agent session via SymphonyAgentRunner
  //      d. Move task state: queued → running
  //   4. Check for stalled runs → fail them
  //   5. Process retry queue → re-queue eligible failed tasks
}
```

### 3.5 `apps/server/src/symphony/SymphonyPushService.ts`

Emits typed push events through existing `ServerPushBus`:

- `symphony.taskEvent` — on task CRUD and state transitions
- `symphony.runEvent` — on run start/complete/fail
- Reuse `orchestration.domainEvent` for agent-level events (already exists)

### 3.6 Wire into `serverLayers.ts`

Add Symphony services to the Effect layer graph:

```typescript
// In serverLayers.ts
SymphonyTaskStoreLive
SymphonyRunStoreLive
SymphonyWorkflowLoaderLive
SymphonyWorkspaceManagerLive
SymphonyAgentRunnerLive
SymphonyOrchestratorLive
SymphonyPushServiceLive
```

### 3.7 Wire into `wsServer.ts`

Add Symphony WS method handlers (following existing pattern for orchestration/provider methods).

---

## Phase 4: Web — UI Components

### 4.1 State Management

New store: `apps/web/src/symphonyStore.ts`

```typescript
// Zustand store (matching existing store.ts pattern)
interface SymphonyState {
  tasks: Map<SymphonyTaskId, SymphonyTask>
  runs: Map<SymphonyRunId, SymphonyRun>
  activeRunStreams: Map<SymphonyRunId, ProviderEvent[]>
  selectedTaskId: SymphonyTaskId | null
  boardFilter: { priority?: SymphonyTaskPriority; labels?: string[] }
}
```

### 4.2 New route: `/symphony`

Location: `apps/web/src/routes/symphony.tsx`

Top-level route added to TanStack Router config.

### 4.3 Components

```
apps/web/src/components/symphony/
├── SymphonyDashboard.tsx       # Layout: Board + Detail split view
├── SymphonyBoard.tsx           # Kanban columns with drag-and-drop
├── SymphonyColumn.tsx          # Single column (Backlog, Queued, etc.)
├── SymphonyTaskCard.tsx        # Card in column (title, priority, status)
├── SymphonyTaskDetail.tsx      # Side panel: task info + live run output
├── SymphonyTaskForm.tsx        # Create/edit task dialog
├── SymphonyRunHistory.tsx      # List of run attempts for a task
├── SymphonyRunOutput.tsx       # Live agent output (reuse ChatMarkdown)
├── SymphonyMetrics.tsx         # Stats bar (active, queued, done, tokens)
└── SymphonyWorkflowEditor.tsx  # WORKFLOW.md editor (P2)
```

### 4.4 Sidebar Integration

Add Symphony tab/button to existing `Sidebar.tsx`:
- Icon: grid/kanban icon
- Navigate to `/symphony` route
- Badge showing count of running tasks

### 4.5 Drag and Drop

Use `@dnd-kit/core` (or check if project already has a DnD library) for Kanban drag-and-drop. Dragging a task between columns triggers `symphony.moveTask` WS call.

### 4.6 Live Agent Output

Reuse existing `ChatMarkdown.tsx` and streaming message rendering for displaying agent output in `SymphonyRunOutput.tsx`. Subscribe to `symphony.runEvent` push channel filtered by run ID.

---

## Phase 5: Integration & Polish

### 5.1 Connect Symphony tasks ↔ Orchestration threads

When SymphonyAgentRunner starts a run, it creates an orchestration thread. Link:
- `symphony_runs.thread_id` → `orchestration_threads.thread_id`
- User can click "View thread" from task detail to see full chat history

### 5.2 Project-scoped Symphony

Each project has its own:
- Task board
- WORKFLOW.md
- Workspace directory
- Orchestrator instance (or shared orchestrator filtering by projectId)

### 5.3 Persistence recovery

On server restart:
- Resume running tasks (re-query state=running from DB)
- Re-attach to active agent sessions if possible
- Otherwise, mark interrupted runs as failed and re-queue

### 5.4 Error Handling

- Agent crash → mark run failed, apply retry policy
- Workspace creation failure → mark run failed, do not retry
- Stall detection → auto-interrupt after stall_timeout_ms
- Turn timeout → auto-interrupt after turn_timeout_ms
