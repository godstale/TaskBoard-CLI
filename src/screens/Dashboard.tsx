import React, { useState, useEffect, useMemo } from 'react'
import { Box, Text, useStdout } from 'ink'
import type { Key } from 'ink'
import type { EpicWithTasks, ProjectInfo, Task, TaskStatus } from '../core/index.js'
import { useSafeInput } from '../useSafeInput.js'
import type { Screen } from '../useTaskBoard.js'

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

function ProgressBar({ value, total, width = 20 }: { value: number; total: number; width?: number }) {
  const filled = total > 0 ? Math.round((value / total) * width) : 0
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return <Text>{bar} {pct}%</Text>
}

type FlatRow =
  | { kind: 'epic-header'; epicId: string; title: string; done: number; total: number }
  | { kind: 'task'; task: Task; flatIdx: number }
  | { kind: 'child'; child: Task }
  | { kind: 'spacer'; key: string }

interface Props {
  project: ProjectInfo | undefined
  epics: EpicWithTasks[]
  objectives: Task[]
  setScreen: (screen: Screen) => void
  setSelectedTask: (id: string | null) => void
  [key: string]: any
}

// Fixed overhead rows: tab bar (3) + outer padding (2) + dashboard header (3) + header margin (1)
const OVERHEAD_ROWS = 9

export function Dashboard({ project, epics, objectives, setScreen, setSelectedTask }: Props) {
  const { stdout } = useStdout()
  const allTasks = useMemo(() => epics.flatMap(e => e.tasks.map(t => t.task)), [epics])
  const doneTasks = allTasks.filter(t => t.status === 'done').length
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = []
    for (const { epic, tasks } of epics) {
      const epicDone = tasks.filter(t => t.task.status === 'done').length
      rows.push({ kind: 'epic-header', epicId: epic.id, title: epic.title, done: epicDone, total: tasks.length })
      for (const { task, children } of tasks) {
        const flatIdx = allTasks.findIndex(t => t.id === task.id)
        rows.push({ kind: 'task', task, flatIdx })
        for (const child of children) {
          rows.push({ kind: 'child', child })
        }
      }
      rows.push({ kind: 'spacer', key: `spacer-${epic.id}` })
    }
    return rows
  }, [epics, allTasks])

  const terminalRows = stdout?.rows ?? 24
  const availableRows = Math.max(3, terminalRows - OVERHEAD_ROWS)

  // Auto-scroll to keep the selected task row visible
  useEffect(() => {
    const selectedRow = flatRows.findIndex(r => r.kind === 'task' && r.flatIdx === selectedIdx)
    if (selectedRow < 0) return
    setScrollOffset(prev => {
      if (selectedRow < prev) return selectedRow
      // Compute actual visible content rows at the current offset (excluding scroll indicator rows)
      const currentContentRows = availableRows
        - (prev > 0 ? 1 : 0)
        - (prev + availableRows < flatRows.length ? 1 : 0)
      if (selectedRow >= prev + currentContentRows) {
        // Reserve space for both potential scroll indicators (worst case availableRows - 2)
        return Math.max(0, selectedRow - availableRows + 3)
      }
      return prev
    })
  }, [selectedIdx, availableRows, flatRows])

  useSafeInput((_: string, key: Key) => {
    if (key.upArrow) setSelectedIdx(i => Math.max(0, i - 1))
    if (key.downArrow) setSelectedIdx(i => Math.min(allTasks.length - 1, i + 1))
    if (key.return && allTasks.length > 0) {
      setSelectedTask(allTasks[selectedIdx].id)
      setScreen('taskops')
    }
  })

  const canScrollUp = scrollOffset > 0
  const canScrollDown = scrollOffset + availableRows < flatRows.length
  // Reserve 1 row each for scroll indicators when visible
  const contentRows = availableRows - (canScrollUp ? 1 : 0) - (canScrollDown ? 1 : 0)
  const visibleRows = flatRows.slice(scrollOffset, scrollOffset + Math.max(1, contentRows))

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="single" paddingX={1} marginBottom={1}>
        <Text bold>{project?.title ?? 'Project'}</Text>
        <Text> | </Text>
        <Text>Epics: {epics.length}  Tasks: {allTasks.length}  </Text>
        <Text color="green">Done: {doneTasks}/{allTasks.length}  </Text>
        <Text color="yellow">In Progress: {inProgressTasks}  </Text>
        <Text dimColor>[↑↓] Task 선택  [Enter] Task Ops 이동</Text>
      </Box>

      {/* Scrollable epic/task list */}
      <Box flexDirection="column">
        {canScrollUp && <Text dimColor>  ↑ 위로 더 있음</Text>}
        {visibleRows.map((row, i) => {
          if (row.kind === 'spacer') {
            return <Box key={row.key} />
          }
          if (row.kind === 'epic-header') {
            return (
              <Box key={row.epicId}>
                <Text bold color="cyan">[{row.epicId}] {row.title}  </Text>
                <ProgressBar value={row.done} total={row.total} />
              </Box>
            )
          }
          if (row.kind === 'task') {
            const isSelected = row.flatIdx === selectedIdx
            return (
              <Box key={row.task.id} marginLeft={2} flexDirection="column">
                <Box>
                  <Text color="cyan">{isSelected ? '▶ ' : '  '}</Text>
                  <Text color={isSelected ? 'cyan' : STATUS_COLOR[row.task.status]} bold={isSelected}>
                    {STATUS_ICON[row.task.status]} [{row.task.id}] {row.task.title}
                  </Text>
                  <Text dimColor>  {row.task.status}</Text>
                  {row.task.workflow_id && (
                    <Text dimColor>  [{row.task.workflow_id}]</Text>
                  )}
                  {row.task.parallel_group && (
                    <Text color="magenta">  ⇉{row.task.parallel_group}</Text>
                  )}
                </Box>
                {row.task.status === 'interrupted' && row.task.interrupt && (
                  <Box marginLeft={4}>
                    <Text color="red">⚠ {row.task.interrupt}</Text>
                  </Box>
                )}
              </Box>
            )
          }
          if (row.kind === 'child') {
            return (
              <Box key={row.child.id} marginLeft={4}>
                <Text color={STATUS_COLOR[row.child.status]} dimColor>
                  {STATUS_ICON[row.child.status]} [{row.child.id}] {row.child.title}
                </Text>
              </Box>
            )
          }
          return null
        })}
        {canScrollDown && <Text dimColor>  ↓ 아래로 더 있음</Text>}
      </Box>

      {/* Objectives section */}
      {objectives && objectives.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="magenta">Objectives</Text>
          {objectives.map(obj => (
            <Box key={obj.id} marginLeft={2}>
              <Text color={STATUS_COLOR[obj.status]}>
                {STATUS_ICON[obj.status]} [{obj.id}] {obj.title}
              </Text>
              {obj.due_date && (
                <Text dimColor>  due: {obj.due_date}</Text>
              )}
              {obj.milestone_target && (
                <Text dimColor>  🎯 {obj.milestone_target}</Text>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
