import React, { useState, useMemo } from 'react'
import { Box, Text, useStdout } from 'ink'
import type { Key } from 'ink'
import { useSafeInput } from '../useSafeInput.js'
import type { Workflow, EpicWithTasks, Task, TaskStatus } from '../core/index.js'

const STATUS_ICON: Record<TaskStatus, string> = {
  done: '✓',
  in_progress: '●',
  todo: '○',
  interrupted: '✕',
  cancelled: '—',
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  done: 'green',
  in_progress: 'yellow',
  todo: 'white',
  interrupted: 'red',
  cancelled: 'gray',
}

const WORKFLOW_STATUS_COLOR: Record<string, string> = {
  active: 'cyan',
  completed: 'green',
  archived: 'gray',
}

// tab bar (3) + outer padding (2) + header (3) + margin (1)
const OVERHEAD_ROWS = 9

interface Props {
  workflows: Workflow[]
  epics: EpicWithTasks[]
  [key: string]: any
}

type FlatRow =
  | { kind: 'workflow'; workflow: Workflow; taskCount: number; doneCount: number; idx: number }
  | { kind: 'task'; task: Task }
  | { kind: 'spacer'; key: string }

export function Workflows({ workflows, epics }: Props) {
  const { stdout } = useStdout()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)

  // Build a map: workflow_id → tasks (from epics)
  const allTasks = useMemo(
    () => epics.flatMap(e => e.tasks.flatMap(t => [t.task, ...t.children])),
    [epics]
  )

  const workflowTaskMap = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of allTasks) {
      if (t.workflow_id) {
        const list = map.get(t.workflow_id) ?? []
        list.push(t)
        map.set(t.workflow_id, list)
      }
    }
    // Sort by seq_order
    for (const [id, tasks] of map) {
      map.set(id, tasks.sort((a, b) => {
        const sa = a.seq_order ?? Infinity
        const sb = b.seq_order ?? Infinity
        return sa !== sb ? sa - sb : a.created_at.localeCompare(b.created_at)
      }))
    }
    return map
  }, [allTasks])

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = []
    if (workflows.length === 0) return rows
    workflows.forEach((wf, idx) => {
      const tasks = workflowTaskMap.get(wf.id) ?? []
      const doneCount = tasks.filter(t => t.status === 'done').length
      rows.push({ kind: 'workflow', workflow: wf, taskCount: tasks.length, doneCount, idx })
      if (idx === selectedIdx) {
        for (const task of tasks) {
          rows.push({ kind: 'task', task })
        }
        rows.push({ kind: 'spacer', key: `spacer-${wf.id}` })
      }
    })
    return rows
  }, [workflows, workflowTaskMap, selectedIdx])

  const terminalRows = stdout?.rows ?? 24
  const availableRows = Math.max(3, terminalRows - OVERHEAD_ROWS)
  const canScrollUp = scrollOffset > 0
  const canScrollDown = scrollOffset + availableRows < flatRows.length
  const contentRows = availableRows - (canScrollUp ? 1 : 0) - (canScrollDown ? 1 : 0)
  const visibleRows = flatRows.slice(scrollOffset, scrollOffset + Math.max(1, contentRows))

  useSafeInput((_: string, key: Key) => {
    if (key.upArrow) {
      setSelectedIdx(i => {
        const next = Math.max(0, i - 1)
        setScrollOffset(0)
        return next
      })
    }
    if (key.downArrow) {
      setSelectedIdx(i => {
        const next = Math.min(workflows.length - 1, i + 1)
        setScrollOffset(0)
        return next
      })
    }
  })

  const selectedWf = workflows[selectedIdx]
  const selectedTasks = selectedWf ? (workflowTaskMap.get(selectedWf.id) ?? []) : []
  const doneTasks = selectedTasks.filter(t => t.status === 'done').length

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="single" paddingX={1} marginBottom={1}>
        <Text bold>Workflows</Text>
        <Text> | </Text>
        <Text>총 {workflows.length}개</Text>
        {selectedWf && (
          <>
            <Text>  |  선택: </Text>
            <Text bold color="cyan">[{selectedWf.id}] {selectedWf.title}</Text>
            <Text>  Tasks: </Text>
            <Text color="green">{doneTasks}</Text>
            <Text>/{selectedTasks.length}</Text>
          </>
        )}
        <Text dimColor>  [↑↓] Workflow 선택</Text>
      </Box>

      {workflows.length === 0 ? (
        <Text dimColor>Workflow가 없습니다. `python -m cli workflow create` 로 생성하세요.</Text>
      ) : (
        <Box flexDirection="column">
          {canScrollUp && <Text dimColor>  ↑ 위로 더 있음</Text>}
          {visibleRows.map((row, i) => {
            if (row.kind === 'spacer') return <Box key={row.key} />

            if (row.kind === 'workflow') {
              const isSelected = row.idx === selectedIdx
              const statusColor = WORKFLOW_STATUS_COLOR[row.workflow.status] ?? 'white'
              return (
                <Box key={row.workflow.id}>
                  <Text color="cyan">{isSelected ? '▶ ' : '  '}</Text>
                  <Text bold={isSelected} color={isSelected ? 'cyan' : 'white'}>
                    [{row.workflow.id}] {row.workflow.title}
                  </Text>
                  <Text color={statusColor}>  {row.workflow.status}</Text>
                  <Text dimColor>  {row.doneCount}/{row.taskCount} done</Text>
                  {row.workflow.source_file && (
                    <Text dimColor>  ← {row.workflow.source_file}</Text>
                  )}
                </Box>
              )
            }

            if (row.kind === 'task') {
              const t = row.task
              const seqLabel = t.seq_order != null ? `#${t.seq_order} ` : '   '
              const depsLabel = t.depends_on && t.depends_on.length > 0
                ? ` (deps: ${t.depends_on.join(', ')})`
                : ''
              return (
                <Box key={t.id} marginLeft={4}>
                  <Text dimColor>{seqLabel}</Text>
                  <Text color={STATUS_COLOR[t.status]}>
                    {STATUS_ICON[t.status]} [{t.id}] {t.title}
                  </Text>
                  {t.parallel_group && (
                    <Text color="magenta">  ⇉{t.parallel_group}</Text>
                  )}
                  {depsLabel.length > 0 && (
                    <Text dimColor>{depsLabel}</Text>
                  )}
                  {t.status === 'interrupted' && t.interrupt && (
                    <Text color="red">  ⚠ {t.interrupt}</Text>
                  )}
                </Box>
              )
            }

            return null
          })}
          {canScrollDown && <Text dimColor>  ↓ 아래로 더 있음</Text>}
        </Box>
      )}
    </Box>
  )
}
