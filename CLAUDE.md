# TaskBoard CLI — Claude Code Guide

> Quick reference for Claude Code. Full architecture details → [`docs/architecture.md`](docs/architecture.md)

---

## Project Overview

TaskBoard CLI is a **read-only terminal visualization tool** for [TaskOps](https://github.com/godstale/TaskOps) projects.
It reads `taskops.db` (SQLite) produced by TaskOps and renders the Epic/Task hierarchy, operation history, and resources as a TUI app built with Ink 5.

---

## Project Structure

```
TaskBoard-CLI/
├── src/
│   ├── core/        # SQLite queries + chokidar watcher
│   │   ├── db.ts
│   │   ├── models.ts
│   │   ├── queries.ts
│   │   ├── watcher.ts
│   │   └── index.ts
│   ├── screens/     # TUI screen components
│   │   ├── ProjectSelect.tsx
│   │   ├── Dashboard.tsx
│   │   ├── TaskOperations.tsx
│   │   ├── Resources.tsx
│   │   └── Settings.tsx
│   ├── App.tsx
│   ├── index.tsx        # Entry point + CLI arg parsing
│   ├── useTaskBoard.ts  # State hook
│   └── useSafeInput.ts
├── tests/
│   ├── core/            # db, queries, watcher tests
│   ├── Dashboard.test.tsx
│   ├── ProjectSelect.test.tsx
│   └── TaskOperations.test.tsx
├── example/
│   ├── sample.db              # Standalone sample SQLite DB (manual testing)
│   ├── create-sample-db.js    # Script to regenerate sample.db
│   ├── sample/                # Sample TaskOps project folder
│   └── TaskOps_Test/          # Another sample TaskOps project folder
├── docs/
│   └── architecture.md        # Detailed architecture reference ← READ THIS FIRST
├── dist/                      # Compiled output (tsc)
├── CHANGELOG.md
├── README.md
└── README.ko.md
```

---

## Key Commands

```bash
# Install dependencies
pnpm install

# Build (tsc → dist/)
pnpm build

# Run tests
pnpm test

# Dev mode (--path points to the parent folder of TaskOps project folders)
pnpm dev -- --path ./example   # lists sample + TaskOps_Test
pnpm dev                       # interactive path input

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
- **Screen flow** — ProjectSelect → Dashboard / TaskOperations / Resources / Settings
- **Testing strategy** — Vitest + ink-testing-library

---

## Core Concepts

### Data Flow
```
taskops.db (SQLite)
  └── src/core (better-sqlite3)
        └── src/ (Ink 5 TUI app)
```

### DB Schema (read-only)

| Table | Key columns |
|-------|-------------|
| `tasks` | `id`, `project_id`, `type` (project/epic/task/objective), `status`, `parent_id`, `seq_order` |
| `operations` | `id`, `task_id`, `operation_type` (start/progress/complete/error/interrupt), `summary` |
| `resources` | `id`, `task_id`, `file_path`, `res_type` (input/output/reference/intermediate) |
| `settings` | `key`, `value`, `description` |

### TypeScript Types (`src/core/models.ts`)
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
| Package manager | pnpm 8 |
| Core | better-sqlite3, chokidar |
| TUI | Ink 5, ink-select-input, ink-text-input |
| Testing | Vitest, ink-testing-library |

---

## Testing

- **Sample DB**: `example/sample.db` — 1 project (`FIX`), 2 epics, 5 tasks, 6 operations, 3 resources, 3 settings
- **Core tests**: `tests/core/` — db, queries, watcher
- **TUI tests**: `tests/` — ProjectSelect, Dashboard, TaskOperations rendering

---

## Coding Conventions

- **Read-only**: TaskBoard never writes to `taskops.db`. All query functions are SELECT only.
- **TypeScript strict**: Strict TypeScript 5.4. Avoid `any`.

---

## Related

- [TaskOps](https://github.com/godstale/TaskOps) — the AI agent project management tool that produces `taskops.db`
- [`CHANGELOG.md`](CHANGELOG.md) — version history
