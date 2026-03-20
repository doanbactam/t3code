# Symphony Integration — Product Requirements Document (PRD)

## 1. Overview

### 1.1 What

Integrate OpenAI Symphony's orchestration model into T3 Code as a **built-in autonomous task runner** — without any external issue tracker dependency (no Linear). Users create tasks in a Kanban board UI, and T3 Code's Symphony orchestrator automatically dispatches coding agents to work on them.

### 1.2 Why

T3 Code today is purely **interactive**: one user ↔ one agent ↔ one conversation. Symphony adds a second mode — **autonomous batch execution** — where users define work items and the system processes them concurrently with retries, workspace isolation, and progress tracking. This transforms T3 Code from a chat tool into an **AI-powered project management platform**.

### 1.3 Who

- **Solo developers** who want to parallelize coding tasks across multiple agent sessions
- **Small teams** who need a lightweight task board with automated agent execution
- **Power users** who want to define custom WORKFLOW.md prompts for repeatable agent behaviors

### 1.4 Success Metrics

- User can create a task, queue it, and have an agent complete it without manual intervention
- Multiple tasks can run concurrently (configurable concurrency limit)
- Failed tasks retry automatically with exponential backoff
- User can monitor all task progress in real-time from a single dashboard

---

## 2. User Stories

### P0 — Must Have (MVP)

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| S1 | As a user, I can create tasks with title + description | Task appears in Backlog column |
| S2 | As a user, I can drag tasks between Kanban columns | State transitions are persisted |
| S3 | As a user, I can queue tasks for agent execution | Dragging to "Queued" column triggers orchestrator pickup |
| S4 | As a user, I can see live agent output for a running task | TaskDetail panel streams agent events in real-time |
| S5 | As a user, I can see which tasks are running/done/failed | Status badges + column placement update in real-time |
| S6 | As a user, I can write a WORKFLOW.md that defines agent behavior | Workflow prompt is injected into agent sessions |
| S7 | As a user, I can stop a running task | Interrupts the agent session, task moves to failed/stopped |
| S8 | As a user, I can view diffs produced by completed tasks | Reuse existing diff infrastructure |

### P1 — Should Have

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| S9 | As a user, I can set task priority (high/medium/low) | Orchestrator picks higher-priority tasks first |
| S10 | As a user, I can add labels/tags to tasks | Labels visible on task cards, filterable |
| S11 | As a user, I can see retry history for failed tasks | Run history with attempt count, errors, timestamps |
| S12 | As a user, I can configure max concurrency | Setting in workflow or UI, enforced by orchestrator |
| S13 | As a user, I can see token usage per task | Aggregated from agent session metrics |

### P2 — Nice to Have

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| S14 | As a user, I can edit WORKFLOW.md in the browser | In-app editor with YAML front matter + prompt preview |
| S15 | As a user, I can bulk-create tasks from a list | Paste or import multiple tasks at once |
| S16 | As a user, I can see aggregated metrics across all tasks | Dashboard with throughput, success rate, token burn |

---

## 3. Functional Requirements

### 3.1 Task Model

```
SymphonyTask {
  id:            string (uuid)
  projectId:     ProjectId
  title:         string
  description:   string (markdown)
  state:         "backlog" | "queued" | "running" | "review" | "done" | "failed"
  priority:      "low" | "medium" | "high"
  labels:        string[]
  workspaceKey:  string (sanitized from title)
  currentRunId:  string | null
  runCount:      number
  createdAt:     ISO datetime
  updatedAt:     ISO datetime
}
```

### 3.2 Task State Machine

```
backlog ──→ queued ──→ running ──→ review ──→ done
                  ↑        │          │
                  │        ▼          │
                  ←──── failed ←──────┘
```

- `backlog → queued`: User drags or clicks "Queue"
- `queued → running`: Orchestrator auto-picks when capacity available
- `running → review`: Agent completes successfully (if review enabled)
- `running → done`: Agent completes successfully (if auto-complete)
- `running → failed`: Agent errors, timeout, or stall
- `failed → queued`: Auto-retry (up to max retries) or manual re-queue
- `review → done`: User approves
- `review → queued`: User rejects, re-queue for another attempt

### 3.3 Orchestrator Behavior

- **Poll interval**: configurable, default 2s (in-process, so low-latency)
- **Concurrency**: configurable, default 3 concurrent tasks
- **Retry**: exponential backoff, configurable max attempts (default 3), configurable max backoff (default 5min)
- **Stall detection**: configurable timeout (default 5min), auto-fail if agent produces no output
- **Turn timeout**: configurable (default 60min per task)
- **Task selection**: highest priority first, then oldest createdAt

### 3.4 Workspace Isolation

Each task gets its own workspace directory under the project root:

```
<project-root>/
  .t3/
    symphony/
      workspaces/
        <workspace-key>/    ← per-task isolated dir
```

Lifecycle hooks (from Symphony SPEC §9):
- `after_create`: run after workspace dir created
- `before_run`: run before agent starts (e.g., git checkout, branch create)
- `after_run`: run after agent completes
- `before_remove`: run before workspace cleanup

### 3.5 WORKFLOW.md Format

```yaml
---
agent:
  max_concurrency: 3
  max_retries: 3
  max_retry_backoff_ms: 300000
  turn_timeout_ms: 3600000
  stall_timeout_ms: 300000
codex:
  command: codex app-server
  approval_policy: on-failure
workspace:
  root: .t3/symphony/workspaces
hooks:
  after_create: ""
  before_run: ""
  after_run: ""
  timeout_ms: 60000
---

You are working on task: {{ task.title }}

## Task Description

{{ task.description }}

## Instructions

{{ task.instructions }}

## Constraints

- Work only within the designated workspace
- Do not modify files outside the task scope
- Commit your changes with a descriptive message referencing the task
```

### 3.6 WebSocket Protocol Extensions

New WS methods:
- `symphony.listTasks` — list all tasks for a project
- `symphony.createTask` — create a new task
- `symphony.updateTask` — update task fields
- `symphony.deleteTask` — delete a task
- `symphony.moveTask` — change task state (column)
- `symphony.retryTask` — re-queue a failed task
- `symphony.stopTask` — interrupt a running task
- `symphony.getRunHistory` — get run attempts for a task
- `symphony.getWorkflow` — get parsed WORKFLOW.md
- `symphony.updateWorkflow` — update WORKFLOW.md content

New WS push channels:
- `symphony.taskEvent` — task state changes (created, moved, updated, deleted)
- `symphony.runEvent` — run lifecycle (started, progress, completed, failed)
- `symphony.runStream` — live agent output for a specific run

---

## 4. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Task creation latency | < 50ms |
| Orchestrator poll → agent start | < 3s |
| Live stream latency (agent output → UI) | < 200ms (same as existing chat) |
| Max concurrent tasks | 10 (configurable) |
| Persistence | SQLite (reuse existing migration infra) |
| Offline support | Full — no external dependencies |

---

## 5. Out of Scope (v1)

- External issue tracker integration (Linear, GitHub Issues, Jira)
- Multi-user / multi-tenant
- Task dependencies / DAG execution
- Git worktree per task (future consideration)
- CI/CD integration
- Custom agent providers per task (uses project-level provider)

---

## 6. Technical Constraints

- Must reuse `codexAppServerManager.ts` for agent protocol — no new agent client
- Must follow existing Effect-based service layer patterns (`Layers/`, `Services/`)
- Must use existing SQLite persistence infra (`NodeSqliteClient`, `Migrations`)
- Must use existing WebSocket push infra (`ServerPushBus`, typed channels)
- Must use `@t3tools/contracts` for all shared schemas
- UI must follow existing React patterns (no new state management library)
