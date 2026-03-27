import React, { useState, useEffect } from 'react'
import { Box, Text, useStdout } from 'ink'
import type { Key } from 'ink'
import { useSafeInput } from '../useSafeInput.js'
import type { EpicWithTasks, Operation } from '../core/index.js'

const OP_ICON: Record<string, string> = {
  start: '▶',
  progress: '│',
  complete: '✓',
  error: '✕',
  interrupt: '⚠',
}

const OP_COLOR: Record<string, string> = {
  start: 'cyan',
  progress: 'white',
  complete: 'green',
  error: 'red',
  interrupt: 'yellow',
}

// tab bar (3) + outer padding (2) + task bar (~2) + hint (1) + op box border (2) + task title (1) + separator (1)
const OVERHEAD_ROWS = 12
// detail panel: border top (1) + 3 content lines + border bottom (1) + margin (1)
const DETAIL_PANEL_ROWS = 6

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function formatTokens(n: number): string {
  return n.toLocaleString()
}

interface Props {
  epics: EpicWithTasks[]
  operations: Operation[]
  agentStats: any[]
  selectedTaskId: string | null
  setSelectedTask: (id: string | null) => void
  [key: string]: any
}

export function TaskOperations({ epics, operations, agentStats, selectedTaskId, setSelectedTask }: Props) {
  const { stdout } = useStdout()
  const allTasks = epics.flatMap(e => e.tasks.map(t => t.task))
  const [taskIdx, setTaskIdx] = useState(() => {
    if (!selectedTaskId) return 0
    const idx = allTasks.findIndex(t => t.id === selectedTaskId)
    return idx >= 0 ? idx : 0
  })
  const [selectedOpIdx, setSelectedOpIdx] = useState(0)

  useEffect(() => {
    if (selectedTaskId) {
      const idx = allTasks.findIndex(t => t.id === selectedTaskId)
      if (idx >= 0) setTaskIdx(idx)
    }
  }, [selectedTaskId])

  // Reset op selection when task changes
  useEffect(() => {
    setSelectedOpIdx(0)
  }, [taskIdx])

  const selectedTask = allTasks[taskIdx]

  const taskOps = selectedTask
    ? operations.filter(o => o.task_id === selectedTask.id)
    : []

  const terminalRows = stdout?.rows ?? 24
  const hasStats = agentStats && agentStats.length > 0
  const statsRows = hasStats ? Math.min(agentStats.length, 3) + 1 : 0
  
  const availableOpRows = Math.max(3, terminalRows - OVERHEAD_ROWS - DETAIL_PANEL_ROWS - statsRows)

  // Derive scroll offset to keep selectedOpIdx visible (centered)
  const opScrollOffset = Math.min(
    Math.max(0, selectedOpIdx - Math.floor(availableOpRows / 2)),
    Math.max(0, taskOps.length - availableOpRows)
  )
  const visibleOps = taskOps.slice(opScrollOffset, opScrollOffset + availableOpRows)
  const canScrollUp = opScrollOffset > 0
  const canScrollDown = opScrollOffset + availableOpRows < taskOps.length

  const selectedOp: Operation | null = taskOps[selectedOpIdx] ?? null

  useSafeInput((_: string, key: Key) => {
    if (key.leftArrow) {
      const newIdx = Math.max(0, taskIdx - 1)
      setTaskIdx(newIdx)
      setSelectedTask(allTasks[newIdx]?.id ?? null)
    }
    if (key.rightArrow) {
      const newIdx = Math.min(allTasks.length - 1, taskIdx + 1)
      setTaskIdx(newIdx)
      setSelectedTask(allTasks[newIdx]?.id ?? null)
    }
    if (key.upArrow) setSelectedOpIdx(i => Math.max(0, i - 1))
    if (key.downArrow) setSelectedOpIdx(i => Math.min(taskOps.length - 1, i + 1))
  })

  // Sliding window of tasks for the task bar
  const TASK_WIN = 5
  const winStart = Math.max(0, Math.min(taskIdx - Math.floor(TASK_WIN / 2), allTasks.length - TASK_WIN))
  const visibleTaskBar = allTasks.slice(winStart, winStart + TASK_WIN)

  const hasNewFields = selectedOp != null && (
    selectedOp.tool_name != null ||
    selectedOp.skill_name != null ||
    selectedOp.mcp_name != null ||
    selectedOp.duration_seconds != null ||
    selectedOp.input_tokens != null ||
    selectedOp.output_tokens != null ||
    (selectedOp.retry_count ?? 0) > 0
  )

  return (
    <Box flexDirection="column" padding={1}>
      {/* Task selection bar */}
      <Box marginBottom={1}>
        {winStart > 0 && <Text dimColor>{'< '}</Text>}
        {visibleTaskBar.map((t) => (
          <Text
            key={t.id}
            color={t === selectedTask ? 'cyan' : 'white'}
            bold={t === selectedTask}
          >
            {t === selectedTask ? `▶${t.id}◀` : t.id}{'  '}
          </Text>
        ))}
        {winStart + TASK_WIN < allTasks.length && <Text dimColor>{' >'}</Text>}
      </Box>
      <Text dimColor>[←→] Select Task  [↑↓] Select Operation</Text>

      {/* Agent Stats (Tools Usage) */}
      {hasStats && (
        <Box borderStyle="single" borderColor="magenta" paddingX={2} marginTop={1} flexDirection="column">
          <Text bold color="magenta">🛠 Tool Usage Stats (Workflow)</Text>
          {agentStats.slice(0, 3).map(stat => (
            <Box key={stat.tool_name}>
              <Text color="cyan">{stat.tool_name.padEnd(15)}</Text>
              <Text>{stat.call_count} calls  </Text>
              <Text dimColor>Avg: {Math.round(stat.avg_duration_ms)}ms</Text>
            </Box>
          ))}
          {agentStats.length > 3 && <Text dimColor>  ... and {agentStats.length - 3} more tools</Text>}
        </Box>
      )}

      {/* Operation list */}
      <Box borderStyle="single" flexDirection="column" paddingX={2} marginTop={1} flexGrow={1}>
        {selectedTask ? (
          <>
            <Text bold>{selectedTask.id}: {selectedTask.title}</Text>
            <Text dimColor>{'─'.repeat(40)}</Text>
            {taskOps.length === 0 && <Text dimColor>No operations recorded</Text>}
            {canScrollUp && <Text dimColor>  ↑ More above</Text>}
            {visibleOps.map((op, i) => {
              const absIdx = opScrollOffset + i
              const isSelected = absIdx === selectedOpIdx
              return (
                <Box key={op.id}>
                  <Text color={isSelected ? 'cyan' : OP_COLOR[op.operation_type]} bold={isSelected}>
                    {OP_ICON[op.operation_type]} {op.operation_type.padEnd(10)}
                  </Text>
                  <Text dimColor>{op.created_at.slice(11, 16)}  </Text>
                  <Text color={op.agent_platform ? 'blue' : 'white'}>
                    {op.agent_platform ?? ''}{'  '}
                  </Text>
                  <Text>{op.summary ?? ''}</Text>
                </Box>
              )
            })}
            {canScrollDown && <Text dimColor>  ↓ More below</Text>}
          </>
        ) : (
          <Text dimColor>No task selected</Text>
        )}
      </Box>

      {/* Detail panel for selected operation */}
      <Box borderStyle="single" flexDirection="column" paddingX={2} marginTop={1}>
        {selectedOp ? (
          <>
            <Box>
              <Text bold color={OP_COLOR[selectedOp.operation_type]}>
                {selectedOp.operation_type}{'  '}
              </Text>
              <Text dimColor>{selectedOp.created_at.slice(11, 16)}</Text>
              {selectedOp.completed_at && (
                <Text dimColor>{' → '}{selectedOp.completed_at.slice(11, 16)}</Text>
              )}
              {selectedOp.duration_seconds != null && (
                <Text color="yellow">{'  '}{formatDuration(selectedOp.duration_seconds)}</Text>
              )}
            </Box>
            {(selectedOp.tool_name || selectedOp.skill_name || selectedOp.mcp_name) && (
              <Box>
                {selectedOp.tool_name && (
                  <Text color="cyan">Tool: {selectedOp.tool_name}{'  '}</Text>
                )}
                {selectedOp.skill_name && (
                  <Text color="magenta">Skill: {selectedOp.skill_name}{'  '}</Text>
                )}
                {selectedOp.mcp_name && (
                  <Text color="blue">MCP: {selectedOp.mcp_name}</Text>
                )}
              </Box>
            )}
            {(selectedOp.input_tokens != null || selectedOp.output_tokens != null || (selectedOp.retry_count ?? 0) > 0) && (
              <Box>
                {(selectedOp.input_tokens != null || selectedOp.output_tokens != null) && (
                  <Text>
                    {'Tokens: '}
                    <Text color="green">in {formatTokens(selectedOp.input_tokens ?? 0)}</Text>
                    {' / '}
                    <Text color="yellow">out {formatTokens(selectedOp.output_tokens ?? 0)}</Text>
                    {'  '}
                  </Text>
                )}
                {(selectedOp.retry_count ?? 0) > 0 && (
                  <Text color="red">Retry: {selectedOp.retry_count}</Text>
                )}
              </Box>
            )}
            {!hasNewFields && <Text dimColor>No extra details</Text>}
          </>
        ) : (
          <Text dimColor>Select an operation</Text>
        )}
      </Box>
    </Box>
  )
}
