# Symphony Integration — Roadmap

## Timeline Overview

```
Week 1-2          Week 3-4          Week 5-6          Week 7-8
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Phase 1   │     │ Phase 2   │     │ Phase 3   │     │ Phase 4   │
│ Foundation│────▶│ Core      │────▶│ UI        │────▶│ Polish    │
│           │     │ Engine    │     │           │     │           │
│ Contracts │     │ Orchestra-│     │ Kanban    │     │ Recovery  │
│ Schemas   │     │ tor loop  │     │ Board     │     │ Metrics   │
│ SQLite    │     │ Agent     │     │ Task      │     │ Workflow  │
│ Migration │     │ Runner    │     │ Detail    │     │ Editor    │
│ TaskStore │     │ Workspace │     │ Live      │     │ Tests     │
│           │     │ Workflow  │     │ Stream    │     │ Docs      │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

---

## Phase 1: Foundation (Week 1-2)

**Goal**: All data structures defined, persistence working, schemas shared.

| # | Task | Package | Est | Depends On |
|---|------|---------|-----|------------|
| 1.1 | Define `symphony.ts` contracts (Task, Run, Workflow schemas) | contracts | 1d | — |
| 1.2 | Extend `ws.ts` with Symphony methods + channels | contracts | 0.5d | 1.1 |
| 1.3 | Re-export from contracts index | contracts | 0.5h | 1.1, 1.2 |
| 1.4 | Migration `016_SymphonyTasks` | server | 0.5d | 1.1 |
| 1.5 | Migration `017_SymphonyRuns` | server | 0.5d | 1.1 |
| 1.6 | `SymphonyTaskStore` persistence service | server | 1.5d | 1.4 |
| 1.7 | `SymphonyRunStore` persistence service | server | 1d | 1.5 |
| 1.8 | Unit tests for TaskStore + RunStore | server | 1d | 1.6, 1.7 |

**Milestone**: `bun typecheck` passes, stores can CRUD tasks/runs in SQLite.

---

## Phase 2: Core Engine (Week 3-4)

**Goal**: Orchestrator can pick tasks, run agents, handle success/failure.

| # | Task | Package | Est | Depends On |
|---|------|---------|-----|------------|
| 2.1 | `SymphonyWorkflowLoader` — parse WORKFLOW.md | server | 1d | 1.1 |
| 2.2 | `SymphonyWorkspaceManager` — per-task dirs + hooks | server | 1.5d | 1.1 |
| 2.3 | `SymphonyAgentRunner` — reuse codexAppServerManager | server | 2d | 1.6, 1.7, 2.1, 2.2 |
| 2.4 | `SymphonyOrchestrator` — poll loop + state machine | server | 2.5d | 2.3 |
| 2.5 | `SymphonyPushService` — WS event emission | server | 1d | 1.2 |
| 2.6 | Wire Symphony into `serverLayers.ts` | server | 0.5d | 2.1-2.5 |
| 2.7 | Wire Symphony WS methods into `wsServer.ts` | server | 1d | 2.6 |
| 2.8 | Integration tests (create task → agent runs → completes) | server | 1.5d | 2.7 |

**Milestone**: Create a task via WS → orchestrator dispatches agent → task completes. Verified via tests.

---

## Phase 3: UI (Week 5-6)

**Goal**: Full Kanban board with live agent output.

| # | Task | Package | Est | Depends On |
|---|------|---------|-----|------------|
| 3.1 | `symphonyStore.ts` — Zustand state for tasks/runs | web | 1d | 1.1 |
| 3.2 | WS subscription for Symphony push channels | web | 0.5d | 1.2, 3.1 |
| 3.3 | `/symphony` route + `SymphonyDashboard` layout | web | 0.5d | 3.1 |
| 3.4 | `SymphonyBoard` + `SymphonyColumn` — Kanban layout | web | 1.5d | 3.3 |
| 3.5 | `SymphonyTaskCard` — card rendering | web | 0.5d | 3.4 |
| 3.6 | Drag-and-drop between columns | web | 1d | 3.4, 3.5 |
| 3.7 | `SymphonyTaskForm` — create/edit dialog | web | 1d | 3.1 |
| 3.8 | `SymphonyTaskDetail` — side panel | web | 1d | 3.1 |
| 3.9 | `SymphonyRunOutput` — live agent stream | web | 1.5d | 3.8, 3.2 |
| 3.10 | `SymphonyRunHistory` — attempt list | web | 0.5d | 3.8 |
| 3.11 | Sidebar integration — Symphony tab + badge | web | 0.5d | 3.3 |

**Milestone**: User can create tasks, drag to queue, watch agent work in real-time.

---

## Phase 4: Polish & Hardening (Week 7-8)

**Goal**: Production-ready with recovery, metrics, and documentation.

| # | Task | Package | Est | Depends On |
|---|------|---------|-----|------------|
| 4.1 | Server restart recovery (resume/re-queue interrupted tasks) | server | 1.5d | 2.4 |
| 4.2 | Stall detection + turn timeout enforcement | server | 1d | 2.4 |
| 4.3 | Retry logic with exponential backoff | server | 1d | 2.4 |
| 4.4 | `SymphonyMetrics` — dashboard stats bar | web | 1d | 3.3 |
| 4.5 | Task ↔ Thread linking (view full chat from task) | web+server | 1d | 2.3 |
| 4.6 | `SymphonyWorkflowEditor` — in-browser editor (P2) | web | 1.5d | 2.1 |
| 4.7 | E2E tests | all | 1.5d | all |
| 4.8 | Documentation update (.docs/symphony.md) | docs | 0.5d | all |
| 4.9 | Update AGENTS.md with Symphony package roles | docs | 0.5h | all |

**Milestone**: Ship-ready. Recovery tested. Docs updated.

---

## Future Phases (Post v1)

### v1.1 — External Tracker Adapters
- Linear integration (re-add as optional adapter)
- GitHub Issues adapter
- Pluggable tracker interface

### v1.2 — Advanced Execution
- Task dependencies / DAG execution order
- Git worktree per task (parallel git branches)
- Custom provider per task (Codex for some, Claude for others)

### v1.3 — Team Features
- Task assignment to specific agent configs
- Shared task boards across users
- Audit log / activity feed

### v1.4 — CI/CD Integration
- Auto-create tasks from CI failures
- PR creation on task completion
- Webhook triggers for external systems
