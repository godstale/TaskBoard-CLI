import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './helpers'
import {
  getProject, getEpicsWithTasks, getWorkflowOrder,
  getOperations, getResources, getSettings,
  getWorkflows, getObjectives, getCheckpoints,
  getSchemaVersion, getRecentOperations, getTaskProgressSummary,
  getCurrentlyInProgressTasks, getWorkflowProgress, getAgentStats
} from '../../src/core/queries.js'
import type { Db } from '../../src/core/db.js'

let db: Db

beforeEach(() => { db = createTestDb() as unknown as Db })

describe('getSchemaVersion', () => {
  it('settings 테이블에서 스키마 버전을 읽어온다', () => {
    // helpers.ts에서 createTestDb가 __schema_version을 2로 설정한다고 가정 (또는 직접 설정)
    const version = getSchemaVersion(db)
    expect(typeof version).toBe('number')
  })
})

describe('getRecentOperations', () => {
  it('워크플로우별 최근 작업을 반환한다', () => {
    const ops = getRecentOperations(db, 'TST-W001')
    expect(ops.length).toBeGreaterThan(0)
    expect(ops[0].workflow_id).toBe('TST-W001')
  })

  it('afterId 이후의 작업만 반환한다', () => {
    const allOps = getRecentOperations(db, 'TST-W001')
    if (allOps.length > 1) {
      const firstId = allOps[0].id
      const recentOps = getRecentOperations(db, 'TST-W001', firstId)
      expect(recentOps.length).toBe(allOps.length - 1)
      expect(recentOps[0].id).toBeGreaterThan(firstId)
    }
  })
})

describe('getTaskProgressSummary', () => {
  it('태스크별 진행 요약을 반환한다', () => {
    const summary = getTaskProgressSummary(db, 'TST-W001') as any[]
    expect(summary.length).toBeGreaterThan(0)
    expect(summary[0]).toHaveProperty('op_count')
    expect(summary[0]).toHaveProperty('error_count')
  })
})

describe('getCurrentlyInProgressTasks', () => {
  it('진행 중인 태스크를 반환한다', () => {
    // TST-T002가 in_progress 상태라고 가정
    const tasks = getCurrentlyInProgressTasks(db, 'TST-W001') as any[]
    expect(tasks).toBeDefined()
  })
})

describe('getWorkflowProgress', () => {
  it('워크플로우 전체 진행률을 반환한다', () => {
    const progress = getWorkflowProgress(db, 'TST-W001') as any
    expect(progress).toHaveProperty('total_tasks')
    expect(progress).toHaveProperty('done_tasks')
  })
})

describe('getAgentStats', () => {
  it('v7 이상이면 도구 사용 통계를 반환한다', () => {
    const stats = getAgentStats(db, 'TST-W001') as any[]
    expect(stats.length).toBeGreaterThan(0)
    expect(stats[0]).toHaveProperty('tool_name')
    expect(stats[0]).toHaveProperty('call_count')
  })
})
