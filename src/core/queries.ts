import type { Db } from './db.js'
import type {
  Task, Operation, Resource, Setting,
  ProjectInfo, EpicWithTasks, TaskWithChildren,
  Workflow, Checkpoint
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

export function getEpicsWithTasks(db: Db, workflowId?: string): EpicWithTasks[] {
  let epicSql = "SELECT * FROM tasks WHERE type = 'epic'"
  const params: any[] = []
  if (workflowId) {
    epicSql += " AND workflow_id = ?"
    params.push(workflowId)
  }
  epicSql += " ORDER BY seq_order ASC, created_at ASC"
  
  const epics = db.prepare(epicSql).all(...params) as any[]

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

export function getWorkflowOrder(db: Db, workflowId?: string): Task[] {
  let sql = "SELECT * FROM tasks WHERE type = 'task'"
  const params: any[] = []
  if (workflowId) {
    sql += " AND workflow_id = ?"
    params.push(workflowId)
  }
  sql += " ORDER BY seq_order ASC NULLS LAST, created_at ASC"
  
  const rows = db.prepare(sql).all(...params) as any[]
  return rows.map(parseTask)
}

export function getOperations(db: Db, taskId?: string, workflowId?: string): Operation[] {
  let sql = "SELECT * FROM operations"
  const params: any[] = []
  const conditions: string[] = []

  if (taskId) {
    conditions.push("task_id = ?")
    params.push(taskId)
  }
  if (workflowId) {
    conditions.push("workflow_id = ?")
    params.push(workflowId)
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ")
  }
  sql += " ORDER BY created_at ASC"
  
  return db.prepare(sql).all(...params) as Operation[]
}

export function getResources(db: Db, taskId?: string, workflowId?: string): Resource[] {
  let sql = "SELECT * FROM resources"
  const params: any[] = []
  const conditions: string[] = []

  if (taskId) {
    conditions.push("task_id = ?")
    params.push(taskId)
  }
  if (workflowId) {
    conditions.push("workflow_id = ?")
    params.push(workflowId)
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ")
  }
  sql += " ORDER BY created_at ASC"

  return db.prepare(sql).all(...params) as Resource[]
}

export function getSettings(db: Db, workflowId?: string): Setting[] {
  let sql = "SELECT * FROM settings"
  const params: any[] = []
  if (workflowId) {
    sql += " WHERE workflow_id = ? OR workflow_id = ''"
    params.push(workflowId)
  }
  sql += " ORDER BY key ASC"
  return db.prepare(sql).all(...params) as Setting[]
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

export function getWorkflows(db: Db): Workflow[] {
  try {
    return db.prepare("SELECT * FROM workflows ORDER BY created_at ASC").all() as Workflow[]
  } catch {
    return []
  }
}

export function getWorkflowTasks(db: Db, workflowId: string): Task[] {
  try {
    const rows = db.prepare(
      "SELECT * FROM tasks WHERE workflow_id = ? AND type = 'task' ORDER BY seq_order ASC NULLS LAST, created_at ASC"
    ).all(workflowId) as any[]
    return rows.map(parseTask)
  } catch {
    return []
  }
}

export function getObjectives(db: Db): Task[] {
  try {
    const rows = db.prepare(
      "SELECT * FROM tasks WHERE type = 'objective' ORDER BY due_date ASC NULLS LAST, created_at ASC"
    ).all() as any[]
    return rows.map(parseTask)
  } catch {
    return []
  }
}

export function getCheckpoints(db: Db): Checkpoint[] {
  try {
    return db.prepare("SELECT * FROM checkpoints ORDER BY created_at DESC").all() as Checkpoint[]
  } catch {
    return []
  }
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
