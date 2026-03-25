import type { Db } from './db.js'
import type {
  Task, Operation, Resource, Setting,
  ProjectInfo, EpicWithTasks, TaskWithChildren,
  Workflow, Checkpoint, AgentEvent
} from './models.js'
import fs from 'fs'
import path from 'path'

function parseTask(row: any): Task {
  return {
    ...row,
    depends_on: row.depends_on ? JSON.parse(row.depends_on) : undefined,
  }
}

export function getSchemaVersion(db: Db): number {
  try {
    const row = db.prepare(
      "SELECT value FROM settings WHERE workflow_id='' AND key='__schema_version'"
    ).get() as any
    return parseInt(row?.value ?? '0')
  } catch {
    return 0
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

/**
 * 워크플로우별 최근 작업 로그 (실시간 피드용)
 */
export function getRecentOperations(db: Db, workflowId: string, afterId: number = 0, limit: number = 50): Operation[] {
  const sql = `
    SELECT o.*
    FROM operations o
    WHERE o.workflow_id = ? AND o.id > ?
    ORDER BY o.id ASC
    LIMIT ?
  `
  return db.prepare(sql).all(workflowId, afterId, limit) as Operation[]
}

/**
 * 태스크별 진행 상태 요약
 */
export function getTaskProgressSummary(db: Db, workflowId: string) {
  const sql = `
    SELECT
        t.id,
        t.title,
        t.status,
        t.type,
        COUNT(o.id)                         AS op_count,
        MAX(o.created_at)                   AS last_activity,
        SUM(CASE WHEN o.operation_type = 'error' THEN 1 ELSE 0 END) AS error_count
    FROM tasks t
    LEFT JOIN operations o ON o.task_id = t.id
    WHERE t.workflow_id = ?
      AND t.type IN ('epic', 'task')
    GROUP BY t.id
    ORDER BY t.seq_order
  `
  return db.prepare(sql).all(workflowId)
}

/**
 * 현재 진행 중인 태스크
 */
export function getCurrentlyInProgressTasks(db: Db, workflowId: string) {
  const sql = `
    SELECT
        t.id,
        t.title,
        t.type,
        o.summary      AS latest_summary,
        o.agent_platform,
        o.created_at   AS last_updated
    FROM tasks t
    JOIN operations o ON o.id = (
        SELECT id FROM operations
        WHERE task_id = t.id
        ORDER BY id DESC LIMIT 1
    )
    WHERE t.status = 'in_progress'
      AND t.workflow_id = ?
    ORDER BY o.id DESC
  `
  return db.prepare(sql).all(workflowId)
}

/**
 * 워크플로우 전체 진행률
 */
export function getWorkflowProgress(db: Db, workflowId: string) {
  const sql = `
    SELECT
        w.id,
        w.title,
        COUNT(CASE WHEN t.type = 'task' THEN 1 END)                          AS total_tasks,
        COUNT(CASE WHEN t.type = 'task' AND t.status = 'done' THEN 1 END)   AS done_tasks,
        COUNT(CASE WHEN t.type = 'task' AND t.status = 'in_progress' THEN 1 END) AS active_tasks
    FROM workflows w
    LEFT JOIN tasks t ON t.workflow_id = w.id
    WHERE w.id = ?
    GROUP BY w.id
  `
  return db.prepare(sql).get(workflowId)
}

/**
 * 에이전트 도구 사용 통계 (v7 이상)
 */
export function getAgentStats(db: Db, workflowId: string) {
  const version = getSchemaVersion(db)
  if (version < 7) return []

  const sql = `
    SELECT
        tool_name,
        COUNT(*)                    AS call_count,
        AVG(duration_ms)            AS avg_duration_ms
    FROM agent_events
    WHERE workflow_id = ?
      AND event_type = 'tool_use'
    GROUP BY tool_name
    ORDER BY call_count DESC
  `
  return db.prepare(sql).all(workflowId)
}

/**
 * 최근 에이전트 이벤트 (v7 이상)
 */
export function getRecentAgentEvents(db: Db, workflowId: string, limit: number = 50): AgentEvent[] {
  const version = getSchemaVersion(db)
  if (version < 7) return []

  const sql = `
    SELECT * FROM agent_events
    WHERE workflow_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `
  return db.prepare(sql).all(workflowId, limit) as AgentEvent[]
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
