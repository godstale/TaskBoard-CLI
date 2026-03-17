# TaskBoard CLI — Architecture & Implementation Reference

> Version 0.2.2 | 2026-03-17

---

## Overview

TaskBoard CLI is a read-only terminal visualization tool for [TaskOps](https://github.com/godstale/TaskOps) projects.
It reads the `taskops.db` SQLite database produced by TaskOps and renders the project's Epic/Task hierarchy,
operation history, and resources as an Ink 5 TUI app.

---

## Project Structure

```
TaskBoard-CLI/
├── src/
│   ├── core/                 # SQLite layer
│   │   ├── index.ts          # Re-exports everything
│   │   ├── models.ts         # TypeScript interfaces
│   │   ├── db.ts             # SQLite connection
│   │   ├── queries.ts        # Read-only query functions
│   │   └── watcher.ts        # DB file watcher
│   ├── screens/              # TUI screen components
│   │   ├── ProjectSelect.tsx
│   │   ├── Dashboard.tsx
│   │   ├── TaskOperations.tsx
│   │   ├── Resources.tsx
│   │   └── Settings.tsx
│   ├── App.tsx               # Root component + screen routing
│   ├── index.tsx             # Entry point + CLI arg parsing
│   ├── useTaskBoard.ts       # State hook (DB load + watcher)
│   └── useSafeInput.ts       # Safe keyboard input hook
├── tests/
│   ├── core/
│   │   ├── db.test.ts
│   │   ├── queries.test.ts
│   │   ├── watcher.test.ts
│   │   └── helpers.ts        # In-memory test DB factory
│   ├── Dashboard.test.tsx
│   ├── ProjectSelect.test.tsx
│   └── TaskOperations.test.tsx
├── example/
│   ├── sample.db              # Sample SQLite DB for manual testing
│   ├── create-sample-db.js    # Script to regenerate sample.db
│   ├── sample/                # Sample TaskOps project folder
│   └── TaskOps_Test/          # Another sample TaskOps project folder
├── docs/
│   └── architecture.md        # This file
├── dist/                      # Compiled output (tsc)
└── package.json
```

---

## Data Flow

```
taskops.db (SQLite, read-only)
  └── src/core (better-sqlite3)
        └── src/ (Ink 5 TUI app)
```

The app never writes to `taskops.db`. All database access is read-only via `better-sqlite3`.

---

## Core Layer (`src/core/`)

### Data Models (`models.ts`)

```typescript
type TaskStatus    = 'todo' | 'in_progress' | 'interrupted' | 'done' | 'cancelled'
type TaskType      = 'project' | 'epic' | 'task' | 'objective'
type OperationType = 'start' | 'progress' | 'complete' | 'error' | 'interrupt'
type ResourceType  = 'input' | 'output' | 'reference' | 'intermediate'

interface Task       { id, project_id, type, title, status, parent_id, seq_order, ... }
interface Operation  { id, task_id, operation_type, agent_platform, summary, ... }
interface Resource   { id, task_id, file_path, res_type, ... }
interface Setting    { key, value, description, updated_at }

// Composite types used by UI layers
interface EpicWithTasks    { epic: Task; tasks: TaskWithChildren[] }
interface TaskWithChildren { task: Task; children: Task[] }
interface ProjectSummary   { project, totalEpics, totalTasks, tasksByStatus }
```

### DB Schema (read-only)

| Table | Key columns |
|-------|-------------|
| `tasks` | `id`, `project_id`, `type`, `status`, `parent_id`, `seq_order` |
| `operations` | `id`, `task_id`, `operation_type`, `summary` |
| `resources` | `id`, `task_id`, `file_path`, `res_type` |
| `settings` | `key`, `value`, `description` |

### Query Functions (`queries.ts`)

| Function | Returns |
|----------|---------|
| `getProject(db)` | Root project row (`type = 'project'`) |
| `getEpicsWithTasks(db)` | Nested Epic → Task → SubTask hierarchy |
| `getWorkflowOrder(db)` | All tasks sorted by `seq_order` |
| `getOperations(db, taskId?)` | All or per-task operation history |
| `getResources(db, taskId?)` | All or per-task resource files |
| `getSettings(db)` | All settings rows |
| `getProjectList(root)` | Subdirectories of `root` that contain `taskops.db` |
| `getProjectSummary(db)` | Aggregated task counts by status |

### DB Watcher (`watcher.ts`)

```
watch(dbPath, onChange) => unwatch

1. chokidar watches the file (fs.watch-based, low overhead)
2. On 'change' event → call onChange()
3. On chokidar error → fall back to setInterval(3000ms) polling
4. unwatch() closes chokidar and/or clears the poll timer
```

---

## TUI App (`src/`)

### Screen Flow

```
node dist/index.js [--path <taskops-root>]
        │
        ├── --path given  ─────────────────┐
        └── no --path → prompt for path ──▶ ProjectSelect
                                                │  select project
                                            App (Tab navigation)
                                    ┌───────────┼───────────┐───────────┐
                                Dashboard  TaskOps  Resources  Settings
```

### State Management

`useTaskBoard(dbPath)` — single hook in `src/useTaskBoard.ts`:
- Opens DB, loads all data on mount
- Registers watcher; calls `reload()` on DB change
- Exposes `{ project, epics, operations, resources, settings, screen, selectedTaskId, reload, setScreen, setSelectedTask }`

### Key Bindings

| Key | Action |
|-----|--------|
| `Tab` | Cycle through screens |
| `R` | Reload data from DB |
| `Q` | Quit |
| `↑` / `↓` | Select task (Dashboard); scroll operations (TaskOperations) |
| `Enter` | Open TaskOperations for selected task (Dashboard) |
| `←` / `→` | Navigate tasks (TaskOperations screen) |

### Screens

| Screen | Description |
|--------|-------------|
| `ProjectSelect` | Scan `taskopsRoot` for projects containing `taskops.db`; select one to open |
| `Dashboard` | Epic/Task hierarchy with progress bars |
| `TaskOperations` | Operation timeline for a selected task |
| `Resources` | Resource file list with type color coding |
| `Settings` | Key/value settings table |

---

## Testing Strategy

| Scope | Tool | Coverage |
|-------|------|----------|
| `src/core` | Vitest | DB open/close, all query functions, watcher callback |
| `src/screens` | Vitest + ink-testing-library | ProjectSelect, Dashboard, TaskOperations rendering |

### Sample DB (`example/sample.db`)

Pre-built SQLite DB for manual app testing and development:
- 1 project (`FIX`)
- 2 epics, 5 tasks (including 2 sub-tasks)
- 6 operations across 2 tasks
- 3 resources (input / output / intermediate)
- 3 settings entries

Regenerate: `node example/create-sample-db.js`

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.4 |
| Package manager | pnpm 8 |
| Core | better-sqlite3, chokidar |
| TUI | Ink 5, ink-select-input, ink-text-input |
| Testing | Vitest, ink-testing-library |
