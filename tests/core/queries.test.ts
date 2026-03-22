import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './helpers'
import {
  getProject, getEpicsWithTasks, getWorkflowOrder,
  getOperations, getResources, getSettings,
  getWorkflows, getObjectives, getCheckpoints
} from '../../src/core/queries.js'
import type { Db } from '../../src/core/db.js'

let db: Db

beforeEach(() => { db = createTestDb() as unknown as Db })

describe('getProject', () => {
  it('프로젝트 기본 정보를 반환한다', () => {
    const p = getProject(db)
    expect(p?.id).toBe('TST')
    expect(p?.title).toBe('Test Project')
  })
})

describe('getEpicsWithTasks', () => {
  it('Epic과 하위 Task를 계층으로 반환한다', () => {
    const epics = getEpicsWithTasks(db)
    expect(epics).toHaveLength(1)
    expect(epics[0].epic.id).toBe('TST-E001')
    expect(epics[0].tasks).toHaveLength(3)
  })
})

describe('getWorkflowOrder', () => {
  it('seq_order 순으로 정렬된 Task를 반환한다', () => {
    const tasks = getWorkflowOrder(db)
    expect(tasks[0].id).toBe('TST-T001')
    expect(tasks[1].id).toBe('TST-T002')
    expect(tasks[2].id).toBe('TST-T003')
  })
})

describe('getOperations', () => {
  it('전체 operations를 반환한다', () => {
    const ops = getOperations(db)
    expect(ops).toHaveLength(2)
  })

  it('특정 task의 operations만 반환한다', () => {
    const ops = getOperations(db, 'TST-T001')
    expect(ops).toHaveLength(2)
    expect(ops.every(o => o.task_id === 'TST-T001')).toBe(true)
  })

  it('schema v2 필드(tool_name, input_tokens 등)를 반환한다', () => {
    const ops = getOperations(db, 'TST-T001')
    const completeOp = ops.find(o => o.operation_type === 'complete')
    expect(completeOp?.tool_name).toBe('Edit')
    expect(completeOp?.input_tokens).toBe(1200)
    expect(completeOp?.output_tokens).toBe(450)
    expect(completeOp?.duration_seconds).toBe(42)
  })
})

describe('getResources', () => {
  it('전체 resources를 반환한다', () => {
    const res = getResources(db)
    expect(res).toHaveLength(1)
  })
})

describe('getSettings', () => {
  it('설정 목록을 반환한다', () => {
    const settings = getSettings(db)
    expect(settings.length).toBeGreaterThan(0)
    expect(settings[0].key).toBe('autonomy_level')
  })
})

describe('getWorkflows', () => {
  it('workflows 목록을 반환한다', () => {
    const workflows = getWorkflows(db)
    expect(workflows).toHaveLength(1)
    expect(workflows[0].id).toBe('TST-W001')
    expect(workflows[0].title).toBe('인증 워크플로우')
    expect(workflows[0].status).toBe('active')
  })
})

describe('getObjectives', () => {
  it('objective 타입 tasks를 반환한다', () => {
    const objectives = getObjectives(db)
    expect(objectives).toHaveLength(1)
    expect(objectives[0].id).toBe('TST-O001')
    expect(objectives[0].due_date).toBe('2026-04-01')
    expect(objectives[0].milestone_target).toBe('Core features done')
  })
})

describe('getCheckpoints', () => {
  it('checkpoints를 최신순으로 반환한다', () => {
    const checkpoints = getCheckpoints(db)
    expect(checkpoints).toHaveLength(1)
    expect(checkpoints[0].id).toBe(1)
    expect(checkpoints[0].note).toBe('before-refactor')
    const snap = JSON.parse(checkpoints[0].snapshot)
    expect(snap['TST-T001'].status).toBe('done')
  })
})
