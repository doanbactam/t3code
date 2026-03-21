# Symphony - Autonomous Task Orchestration

Symphony is an autonomous orchestration layer that runs agent tasks in parallel with configurable workflows, retry logic, and push notifications.

## Overview

Symphony enables you to:

- Create and manage autonomous tasks
- Run multiple agent sessions in parallel
- Configure workflows via `WORKFLOW.md` files
- Monitor task progress in real-time via Kanban board
- Handle failures with automatic retry logic

## Architecture

### Task States

Tasks flow through the following states:

```
backlog → queued → running → review → done
                      ↓
                    failed
```

| State     | Description                                  |
| --------- | -------------------------------------------- |
| `backlog` | Task created but not ready to run            |
| `queued`  | Task waiting to be picked up by orchestrator |
| `running` | Task currently being executed by an agent    |
| `review`  | Task completed, awaiting human review        |
| `done`    | Task successfully completed                  |
| `failed`  | Task execution failed after max retries      |

### Priority Levels

- `high` - Critical tasks, processed first
- `medium` - Default priority
- `low` - Background tasks, processed last

### Task Labels

Labels are arbitrary strings that can be used for:

- Categorization (`bug`, `feature`, `chore`)
- Filtering (`frontend`, `backend`, `docs`)
- Team assignment (`team-a`, `team-b`)

## Workflow Configuration

Create a `WORKFLOW.md` file in your project root:

```markdown
---
maxConcurrency: 3
maxRetries: 2
maxRetryBackoffMs: 60000
turnTimeoutMs: 300000
stallTimeoutMs: 60000
---

# Task Prompt Template

You are an autonomous agent working on: {{task.title}}

## Task Description

{{task.description}}

## Instructions

1. Analyze the task requirements
2. Create a plan with clear milestones
3. Execute the plan step by step
4. Report progress and any blockers
```

### Configuration Options

| Option              | Type   | Default | Description                   |
| ------------------- | ------ | ------- | ----------------------------- |
| `maxConcurrency`    | number | 3       | Maximum parallel tasks        |
| `maxRetries`        | number | 3       | Retry attempts before failing |
| `maxRetryBackoffMs` | number | 60000   | Maximum retry delay           |
| `turnTimeoutMs`     | number | 300000  | Turn timeout (5 min)          |
| `stallTimeoutMs`    | number | 60000   | Stall detection timeout       |

## WebSocket API

### Methods

All Symphony methods are prefixed with `symphony.`:

| Method          | Input                                                    | Output                           | Description            |
| --------------- | -------------------------------------------------------- | -------------------------------- | ---------------------- |
| `listTasks`     | `{ projectId }`                                          | `{ tasks: SymphonyTask[] }`      | List all project tasks |
| `createTask`    | `{ projectId, title, description?, priority?, labels? }` | `{ task: SymphonyTask }`         | Create new task        |
| `updateTask`    | `{ taskId, title?, description?, priority?, labels? }`   | `{ task: SymphonyTask }`         | Update task            |
| `deleteTask`    | `{ taskId }`                                             | `{}`                             | Delete task            |
| `moveTask`      | `{ taskId, newState }`                                   | `{ task: SymphonyTask }`         | Move task to state     |
| `retryTask`     | `{ taskId }`                                             | `{ task: SymphonyTask }`         | Retry failed task      |
| `stopTask`      | `{ taskId }`                                             | `{ task: SymphonyTask }`         | Stop running task      |
| `getRunHistory` | `{ taskId }`                                             | `{ runs: SymphonyRun[] }`        | Get run history        |
| `getWorkflow`   | `{ projectId }`                                          | `{ workflow: SymphonyWorkflow }` | Get workflow config    |

### Push Channels

| Channel              | Event Types                                      | Description           |
| -------------------- | ------------------------------------------------ | --------------------- |
| `symphony.taskEvent` | `created`, `updated`, `deleted`, `state-changed` | Task lifecycle events |
| `symphony.runEvent`  | `started`, `completed`, `failed`, `cancelled`    | Run lifecycle events  |

## UI Components

### Kanban Board

Access the Symphony dashboard at `/symphony`:

- View tasks organized by state
- Click tasks to select and view details
- Drag and drop to move tasks between states

### Metrics Bar

The metrics bar shows:

- Total task count
- Tasks per state with color indicators
- Active running tasks highlighted

## Server Integration

### Layer Wiring

Symphony services are wired in `serverLayers.ts`:

```typescript
// Symphony persistence layer
const symphonyPersistenceLayer = Layer.mergeAll(
  SymphonyTaskRepositoryLive,
  SymphonyRunRepositoryLive,
);

// Symphony orchestration layer
const symphonyLayer = SymphonyLive.pipe(Layer.provideMerge(symphonyPersistenceLayer));
```

### Required Dependencies

- `SymphonyTaskRepository` - Task persistence
- `SymphonyRunRepository` - Run history persistence
- `ProviderService` - Agent execution
- `FileSystem` - Workflow file loading

## Error Handling

### Task Errors

Tasks can fail with:

- Agent execution errors
- Timeout errors
- Stall detection errors

Failed tasks are automatically retried with exponential backoff up to `maxRetries`.

### Recovery

On server restart:

1. Active runs are detected
2. Stalled runs are marked as failed
3. Queued tasks remain queued
4. Running tasks are moved back to queued for retry

## Best Practices

### Task Design

1. **Atomic tasks**: Each task should be a single, well-defined unit of work
2. **Clear titles**: Use descriptive titles that indicate the task goal
3. **Detailed descriptions**: Include context, requirements, and acceptance criteria
4. **Appropriate priority**: Reserve `high` for critical tasks only

### Workflow Design

1. **Clear instructions**: Provide step-by-step guidance in your prompt template
2. **Timeout tuning**: Adjust timeouts based on task complexity
3. **Concurrency limits**: Don't exceed system resources
4. **Retry strategy**: Balance between persistence and failure acknowledgment

### Monitoring

1. Watch for stalled tasks in the `running` state
2. Review failed task error messages
3. Monitor token usage across runs
4. Keep the backlog clean by regularly reviewing queued tasks
