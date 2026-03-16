# TaskBoard — Claude Code Guide

> Quick reference for Claude Code. Full architecture details → [`docs/architecture.md`](docs/architecture.md)

---

## Project Overview

TaskBoard is a **read-only visualization tool** for [TaskOps](https://github.com/godstale/TaskOps) projects.
It reads `taskops.db` (SQLite) produced by TaskOps and renders the Epic/Task hierarchy, operation history, and resources.

Two apps, one shared core:

| Package | Description |
|---------|-------------|
| `@taskboard/core` | DB connection, queries, file watcher (shared business logic) |
| `@taskboard/tui` | Ink 5 terminal app |
| `@taskboard/electron` | Electron 33 + React 18 desktop app |

---

## Monorepo Structure

```
TaskBoard/
├── packages/
│   ├── core/        # @taskboard/core — SQLite queries + chokidar watcher
│   ├── tui/         # @taskboard/tui  — Ink 5 terminal app
│   └── electron/    # @taskboard/electron — Electron desktop app
├── example/
│   ├── sample.db              # Standalone sample SQLite DB (app manual testing)
│   ├── create-sample-db.js    # Script to regenerate sample.db
│   ├── sample/                # Sample TaskOps project folder (contains taskops.db)
│   └── TaskOps_Test/          # Another sample TaskOps project folder
├── docs/
│   └── architecture.md        # Detailed architecture reference ← READ THIS FIRST
├── CHANGELOG.md
├── README.md                  # English README
└── README.ko.md               # Korean README
```

---

## Key Commands

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @taskboard/core test
pnpm --filter @taskboard/tui test
pnpm --filter @taskboard/electron test
pnpm --filter @taskboard/electron test:e2e   # Playwright E2E

# Dev mode — TUI (--path points to the parent folder of TaskOps project folders)
# getProjectList scans subdirectories for taskops.db, so pass the parent directory
pnpm dev:tui -- --path ./example             # lists sample + TaskOps_Test
pnpm dev:tui                                 # interactive path input

# Dev mode — Electron (open folder via UI after launch)
pnpm dev:electron

# Regenerate sample.db
node example/create-sample-db.js
```

---

## Architecture Reference

→ [`docs/architecture.md`](docs/architecture.md)

Key sections:
- **Data models** — `Task`, `Operation`, `Resource`, `Setting`, composite types
- **Query functions** — `getProject`, `getEpicsWithTasks`, `getOperations`, `getResources`, etc.
- **DB watcher** — chokidar + 3 s polling fallback
- **TUI screen flow** — ProjectSelect → Dashboard / TaskOps / Resources / Settings
- **Electron IPC** — channels, preload context-bridge, renderer state hook
- **Testing strategy** — Vitest (core + tui), Playwright E2E (electron)

---

## Core Concepts

### Data Flow
```
taskops.db (SQLite)
  └── @taskboard/core (better-sqlite3)
        ├── @taskboard/tui       — direct DB access
        └── @taskboard/electron
              ├── main process   — DB + watcher via IPC
              └── renderer       — window.taskboard API (context-bridge)
```

### DB Schema (read-only)

| Table | Key columns |
|-------|-------------|
| `tasks` | `id`, `project_id`, `type` (project/epic/task/objective), `status`, `parent_id`, `seq_order` |
| `operations` | `id`, `task_id`, `operation_type` (start/progress/complete/error/interrupt), `summary` |
| `resources` | `id`, `task_id`, `file_path`, `res_type` (input/output/reference/intermediate) |
| `settings` | `key`, `value`, `description` |

### TypeScript Types (`packages/core/src/models.ts`)
```typescript
type TaskStatus    = 'todo' | 'in_progress' | 'interrupted' | 'done' | 'cancelled'
type TaskType      = 'project' | 'epic' | 'task' | 'objective'
type OperationType = 'start' | 'progress' | 'complete' | 'error' | 'interrupt'
type ResourceType  = 'input' | 'output' | 'reference' | 'intermediate'
```

---

## Tech Stack

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

---

## Testing

- **Sample DB**: `example/sample.db` — 1 project (`FIX`), 2 epics, 5 tasks, 6 operations, 3 resources, 3 settings (for manual app testing, not used by automated tests)
- **Core tests**: `packages/core/tests/` — db, queries, watcher
- **TUI tests**: `packages/tui/tests/` — ProjectSelect, Dashboard rendering
- **Electron E2E**: `packages/electron/tests/` — Playwright

---

## Coding Conventions

- **Read-only**: TaskBoard never writes to `taskops.db`. All query functions are SELECT only.
- **IPC boundary**: In the Electron app, the renderer process **never** accesses the filesystem or SQLite directly. All data flows through `window.taskboard` (preload context-bridge).
- **Shared logic**: Business logic belongs in `@taskboard/core`. Avoid duplicating query or watcher logic in tui/electron.
- **TypeScript strict**: All packages use strict TypeScript. Avoid `any`.

---

## Related

- [TaskOps](https://github.com/godstale/TaskOps) — the AI agent project management tool that produces `taskops.db`
- [`CHANGELOG.md`](CHANGELOG.md) — version history
