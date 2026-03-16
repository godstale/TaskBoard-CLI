# TaskBoard — Architecture & Implementation Reference

> Version 0.1.0 | 2026-03-15

---

## Overview

TaskBoard is a read-only visualization tool for [TaskOps](https://github.com/godstale/TaskOps) projects. It reads the `taskops.db` SQLite database produced by TaskOps and renders the project's Epic/Task hierarchy, operation history, and resources in two separate apps:

- **TUI** (`@taskboard/tui`) — Ink 5 terminal app
- **Electron** (`@taskboard/electron`) — Electron 33 + React 18 desktop app

Both apps share business logic through `@taskboard/core`.

---

## Monorepo Structure

```
TaskBoard/
├── package.json                  # pnpm workspaces root
├── pnpm-workspace.yaml
├── CHANGELOG.md
├── fixtures/
│   ├── fixture.db                # Sample SQLite DB for testing
│   └── create-fixture.js         # Script to regenerate fixture.db
├── docs/
│   └── architecture.md           # This file
└── packages/
    ├── core/                     # @taskboard/core
    │   ├── src/
    │   │   ├── index.ts          # Re-exports everything
    │   │   ├── models.ts         # TypeScript interfaces
    │   │   ├── db.ts             # SQLite connection
    │   │   ├── queries.ts        # Read-only query functions
    │   │   └── watcher.ts        # DB file watcher
    │   ├── tests/
    │   │   ├── db.test.ts
    │   │   ├── queries.test.ts
    │   │   ├── watcher.test.ts
    │   │   └── helpers.ts        # In-memory test DB factory
    │   └── package.json
    ├── tui/                      # @taskboard/tui
    │   ├── src/
    │   │   ├── index.tsx         # Entry point + CLI arg parsing
    │   │   ├── App.tsx           # Root component + screen routing
    │   │   ├── useTaskBoard.ts   # State hook (DB load + watcher)
    │   │   ├── useSafeInput.ts   # Safe keyboard input hook
    │   │   └── screens/
    │   │       ├── ProjectSelect.tsx
    │   │       ├── Dashboard.tsx
    │   │       ├── TaskOperations.tsx
    │   │       ├── Resources.tsx
    │   │       └── Settings.tsx
    │   └── tests/
    │       ├── ProjectSelect.test.tsx
    │       └── Dashboard.test.tsx
    └── electron/                 # @taskboard/electron
        ├── src/
        │   ├── main/
        │   │   ├── index.ts      # Electron main process
        │   │   ├── ipc.ts        # IPC channel name constants
        │   │   └── preload.ts    # Context bridge
        │   └── renderer/
        │       ├── index.html
        │       ├── main.tsx      # React entry point
        │       ├── App.tsx       # Root component
        │       ├── useTaskBoard.ts  # Renderer state hook (via IPC)
        │       ├── global.css    # Tailwind base styles
        │       ├── components/
        │       │   └── Sidebar.tsx
        │       └── screens/
        │           ├── ProjectSelect.tsx
        │           ├── Dashboard.tsx
        │           ├── TaskOperations.tsx
        │           ├── Resources.tsx
        │           └── Settings.tsx
        ├── tests/
        │   └── electron.test.ts  # Playwright E2E
        ├── vite.config.ts
        ├── tailwind.config.js
        ├── tsconfig.json         # Renderer (ESNext + DOM)
        ├── tsconfig.main.json    # Main process (CommonJS)
        └── electron-builder.json5
```

---

## Core Package (`@taskboard/core`)

### Data Models (`models.ts`)

```typescript
type TaskStatus   = 'todo' | 'in_progress' | 'interrupted' | 'done' | 'cancelled'
type TaskType     = 'project' | 'epic' | 'task' | 'objective'
type OperationType = 'start' | 'progress' | 'complete' | 'error' | 'interrupt'
type ResourceType = 'input' | 'output' | 'reference' | 'intermediate'

interface Task       { id, project_id, type, title, status, parent_id, seq_order, ... }
interface Operation  { id, task_id, operation_type, agent_platform, summary, ... }
interface Resource   { id, task_id, file_path, res_type, ... }
interface Setting    { key, value, description, updated_at }

// Composite types used by UI layers
interface EpicWithTasks  { epic: Task; tasks: TaskWithChildren[] }
interface TaskWithChildren { task: Task; children: Task[] }
interface ProjectSummary { project, totalEpics, totalTasks, tasksByStatus }
```

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

## TUI App (`@taskboard/tui`)

### Screen Flow

```
npx taskboard-tui [--path <taskops-root>]
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
| `←` / `→` | Navigate tasks (TaskOperations screen) |

---

## Electron App (`@taskboard/electron`)

### IPC Architecture

```
Main Process                           Renderer Process
────────────────                       ─────────────────────────────────
better-sqlite3 queries   ──IPC──▶     window.taskboard.getAllData()
chokidar watcher         ──IPC──▶     window.taskboard.onDbChanged()
dialog.showOpenDialog    ◀──IPC──     window.taskboard.selectFolder()
getProjectList()         ──IPC──▶     window.taskboard.getProjectList()
```

Renderer **never** accesses the filesystem directly. All data flows through the preload context-bridge (`src/main/preload.ts`) which exposes `window.taskboard`.

### IPC Channels (`ipc.ts`)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-project-list` | renderer → main (invoke) | Scan taskops root for projects |
| `get-all-data` | renderer → main (invoke) | Load full DB snapshot + start watcher |
| `select-folder` | renderer → main (invoke) | Open OS folder dialog |
| `db-changed` | main → renderer (send) | Notify renderer to reload |

### Renderer State Hook (`useTaskBoard.ts`)

```typescript
useTaskBoard(dbPath: string | null)
// → { data, selectedTaskId, setSelectedTaskId, screen, setScreen, reload }

// On dbPath change:
//   1. getAllData(dbPath) via IPC → setData()
//   2. onDbChanged listener → reload on next change
//   3. cleanup: offDbChanged() on unmount / path change
```

### Build

- Renderer: Vite (`src/renderer/` → `dist/renderer/`)
- Main process: `tsc -p tsconfig.main.json` (`src/main/` → `dist/main/`)
- Packaging: electron-builder (`electron-builder.json5`)

---

## Testing Strategy

| Package | Tool | Coverage |
|---------|------|----------|
| `@taskboard/core` | Vitest | DB open/close, all query functions, watcher callback |
| `@taskboard/tui` | Vitest + ink-testing-library | ProjectSelect, Dashboard rendering |
| `@taskboard/electron` | Playwright | E2E app launch, screen navigation, data display |

### Test Fixture (`fixtures/fixture.db`)

Pre-built SQLite DB with:
- 1 project (`FIX`)
- 2 epics, 5 tasks (including 2 sub-tasks)
- 6 operations across 2 tasks
- 3 resources (input / output / intermediate)
- 3 settings entries

Regenerate: `node fixtures/create-fixture.js`

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.4 |
| Package manager | pnpm 8 + workspaces |
| Core | better-sqlite3, chokidar |
| TUI | Ink 5, ink-select-input, ink-text-input |
| Desktop | Electron 33, React 18, Vite 5, Tailwind CSS 3 |
| Flow diagram | ReactFlow 11 |
| Testing | Vitest, ink-testing-library, React Testing Library, Playwright |
| Packaging | electron-builder 24 |
