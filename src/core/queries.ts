import type { Db } from './db.js'
import type {
  Task, Operation, Resource, Setting,
  ProjectInfo, EpicWithTasks, TaskWithChildren
} from './models.js'
import fs from 'fs'
import path from 'path'

function parseTask(row: any): Task {
  return {
    ...row,
    depends_on: row.depends_on ? JSON.parse(row.depends_on) : undefined,
  }
}

export function getProject(db: Db): ProjectInfo | undefined {
  const row = db.prepare(
    "SELECT id, title, status, created_at FROM tasks WHERE type = 'project' LIMIT 1"
  ).get() as any
  return row ?? undefined
}

export function getEpicsWithTasks(db: Db): EpicWithTasks[] {
  const epics = db.prepare(
    "SELECT * FROM tasks WHERE type = 'epic' ORDER BY seq_order ASC, created_at ASC"
  ).all() as any[]

  return epics.map(epicRow => {
    const epic = parseTask(epicRow)
    const taskRows = db.prepare(
      "SELECT * FROM tasks WHERE type = 'task' AND parent_id = ? ORDER BY seq_order ASC, created_at ASC"
    ).all(epic.id) as any[]

    const tasks: TaskWithChildren[] = taskRows.map(taskRow => {
      const task = parseTask(taskRow)
      const childRows = db.prepare(
        "SELECT * FROM tasks WHERE type = 'task' AND parent_id = ? ORDER BY seq_order ASC, created_at ASC"
      ).all(task.id) as any[]
      return { task, children: childRows.map(parseTask) }
    })

    return { epic, tasks }
  })
}

export function getWorkflowOrder(db: Db): Task[] {
  const rows = db.prepare(
    "SELECT * FROM tasks WHERE type = 'task' ORDER BY seq_order ASC NULLS LAST, created_at ASC"
  ).all() as any[]
  return rows.map(parseTask)
}

export function getOperations(db: Db, taskId?: string): Operation[] {
  if (taskId) {
    return db.prepare(
      "SELECT * FROM operations WHERE task_id = ? ORDER BY created_at ASC"
    ).all(taskId) as Operation[]
  }
  return db.prepare(
    "SELECT * FROM operations ORDER BY created_at ASC"
  ).all() as Operation[]
}

export function getResources(db: Db, taskId?: string): Resource[] {
  if (taskId) {
    return db.prepare(
      "SELECT * FROM resources WHERE task_id = ? ORDER BY created_at ASC"
    ).all(taskId) as Resource[]
  }
  return db.prepare(
    "SELECT * FROM resources ORDER BY created_at ASC"
  ).all() as Resource[]
}

export function getSettings(db: Db): Setting[] {
  return db.prepare("SELECT * FROM settings ORDER BY key ASC").all() as Setting[]
}

/**
 * TaskOps 루트 폴더 내의 프로젝트 목록을 스캔한다.
 * 주어진 폴더 자체에 taskops.db가 있으면 단일 프로젝트로 반환하고,
 * 없으면 각 하위 폴더에서 taskops.db 파일이 있는 것만 반환.
 */
export function getProjectList(taskopsRoot: string): Array<{ name: string; dbPath: string }> {
  if (!fs.existsSync(taskopsRoot)) return []
  const directDb = path.join(taskopsRoot, 'taskops.db')
  if (fs.existsSync(directDb)) {
    return [{ name: path.basename(taskopsRoot), dbPath: directDb }]
  }

  const results: Array<{ name: string; dbPath: string }> = []

  function scan(dir: string, depth: number) {
    if (depth <= 0) return
    let entries: string[]
    try {
      entries = fs.readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const entryPath = path.join(dir, entry)
      let stat: fs.Stats
      try {
        stat = fs.statSync(entryPath)
      } catch {
        continue
      }
      if (!stat.isDirectory()) continue
      const dbPath = path.join(entryPath, 'taskops.db')
      if (fs.existsSync(dbPath)) {
        results.push({ name: entry, dbPath })
      } else {
        scan(entryPath, depth - 1)
      }
    }
  }

  scan(taskopsRoot, 3)
  return results
}

export function getProjectSummary(db: Db) {
  const project = getProject(db)
  const taskRows = db.prepare(
    "SELECT status, COUNT(*) as count FROM tasks WHERE type IN ('task') GROUP BY status"
  ).all() as Array<{ status: string; count: number }>

  const epicCount = (db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE type = 'epic'"
  ).get() as any).count

  const tasksByStatus: Record<string, number> = {}
  taskRows.forEach(r => { tasksByStatus[r.status] = r.count })
  const totalTasks = taskRows.reduce((sum, r) => sum + r.count, 0)

  return { project, totalEpics: epicCount, totalTasks, tasksByStatus }
}
