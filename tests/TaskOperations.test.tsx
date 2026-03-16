import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import React from 'react'
import { TaskOperations } from '../src/screens/TaskOperations'
import type { EpicWithTasks, Operation } from '../src/core/index.js'

const mockEpics: EpicWithTasks[] = [{
  epic: { id: 'TST-E001', title: '인증 시스템', status: 'in_progress' as const, type: 'epic' as const, project_id: 'TST', created_at: '', updated_at: '' },
  tasks: [
    { task: { id: 'TST-T001', title: '로그인 API', status: 'done' as const, type: 'task' as const, project_id: 'TST', parent_id: 'TST-E001', created_at: '', updated_at: '' }, children: [] },
  ]
}]

const mockOperations: Operation[] = [
  { id: 1, task_id: 'TST-T001', operation_type: 'start', created_at: '2026-03-15 10:00:00' },
  { id: 2, task_id: 'TST-T001', operation_type: 'complete', summary: '완료', created_at: '2026-03-15 10:42:00',
    tool_name: 'Edit', skill_name: 'tdd', input_tokens: 1200, output_tokens: 450, duration_seconds: 42, retry_count: 1 },
]

describe('TaskOperations', () => {
  it('task ID와 제목을 표시한다', () => {
    const { lastFrame } = render(
      <TaskOperations
        epics={mockEpics}
        operations={mockOperations}
        selectedTaskId="TST-T001"
        setSelectedTask={() => {}}
      />
    )
    expect(lastFrame()).toContain('TST-T001')
    expect(lastFrame()).toContain('로그인 API')
  })

  it('operation 목록을 표시한다', () => {
    const { lastFrame } = render(
      <TaskOperations
        epics={mockEpics}
        operations={mockOperations}
        selectedTaskId="TST-T001"
        setSelectedTask={() => {}}
      />
    )
    expect(lastFrame()).toContain('start')
    expect(lastFrame()).toContain('complete')
  })

  it('첫 번째 operation 선택 시 v2 필드가 없으면 상세 정보 없음을 표시한다', () => {
    const { lastFrame } = render(
      <TaskOperations
        epics={mockEpics}
        operations={mockOperations}
        selectedTaskId="TST-T001"
        setSelectedTask={() => {}}
      />
    )
    // selectedOpIdx defaults to 0 (the 'start' op which has no v2 fields)
    expect(lastFrame()).toContain('상세 정보 없음')
  })
})
