import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Key } from 'ink'
import { useSafeInput } from '../useSafeInput.js'
import type { Workflow } from '../core/index.js'

const WORKFLOW_STATUS_COLOR: Record<string, string> = {
  active: 'cyan',
  completed: 'green',
  archived: 'gray',
}

interface Props {
  workflows: Workflow[]
  selectedWorkflowId: string | null
  onSelectWorkflow: (id: string | null) => void
  [key: string]: any // To handle unused props from App.tsx without errors
}

export function Workflows({ workflows, selectedWorkflowId, onSelectWorkflow }: Props) {
  const [highlightIdx, setHighlightIdx] = useState(0)

  // sync highlight with selected if it changes elsewhere
  useEffect(() => {
    if (selectedWorkflowId) {
      const idx = workflows.findIndex(w => w.id === selectedWorkflowId)
      if (idx !== -1) setHighlightIdx(idx)
    }
  }, [selectedWorkflowId, workflows])

  useSafeInput((input: string, key: Key) => {
    if (key.upArrow) {
      setHighlightIdx(i => Math.max(0, i - 1))
    }
    if (key.downArrow) {
      setHighlightIdx(i => Math.min(workflows.length - 1, i + 1))
    }
    if (key.return) {
      const wf = workflows[highlightIdx]
      if (wf) onSelectWorkflow(wf.id)
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box borderStyle="single" paddingX={1} marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">Workflows ({workflows.length})</Text>
          <Text dimColor>  [↑↓] Move [Enter] Select</Text>
        </Box>
        {selectedWorkflowId && (
          <Box>
            <Text>Selected: </Text>
            <Text bold color="green">{selectedWorkflowId}</Text>
          </Box>
        )}
      </Box>

      {workflows.length === 0 ? (
        <Text dimColor>No workflows found.</Text>
      ) : (
        <Box flexDirection="column">
          {workflows.map((wf, idx) => {
            const isHighlighted = idx === highlightIdx
            const isSelected = wf.id === selectedWorkflowId
            const statusColor = WORKFLOW_STATUS_COLOR[wf.status] ?? 'white'
            return (
              <Box key={wf.id}>
                <Text color="cyan">{isHighlighted ? '▶ ' : '  '}</Text>
                <Text bold={isHighlighted} color={isSelected ? 'green' : (isHighlighted ? 'cyan' : 'white')}>
                  [{wf.id}] {wf.title}
                  {isSelected ? ' (SELECTED)' : ''}
                </Text>
                <Text color={statusColor}>  {wf.status}</Text>
                {wf.description && <Text dimColor italic>  - {wf.description}</Text>}
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
