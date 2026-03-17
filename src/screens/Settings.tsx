import React from 'react'
import { Box, Text } from 'ink'
import type { Setting, Checkpoint } from '../core/index.js'

interface Props {
  settings: Setting[]
  checkpoints?: Checkpoint[]
}

export function Settings({ settings, checkpoints = [] }: Props) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Settings</Text>
      <Text dimColor>{'─'.repeat(50)}</Text>
      {settings.length === 0 && <Text dimColor>No settings found</Text>}
      {settings.map(s => (
        <Box key={s.key} marginBottom={0}>
          <Text color="cyan">{s.key.padEnd(24)}</Text>
          <Text color="yellow">{s.value.padEnd(16)}</Text>
          {s.description && <Text dimColor>{s.description}</Text>}
        </Box>
      ))}

      {checkpoints.length > 0 && (
        <>
          <Box marginTop={1}>
            <Text bold>Checkpoints</Text>
            <Text dimColor>  (최근 {checkpoints.length}개)</Text>
          </Box>
          <Text dimColor>{'─'.repeat(50)}</Text>
          {checkpoints.map(cp => {
            let taskCount = 0
            try {
              const snap = JSON.parse(cp.snapshot)
              taskCount = Object.keys(snap).length
            } catch { /* noop */ }
            return (
              <Box key={cp.id}>
                <Text dimColor>#{cp.id}  </Text>
                <Text color="cyan">{cp.created_at.slice(0, 16)}</Text>
                <Text dimColor>  {taskCount} tasks</Text>
                {cp.note && <Text>  {cp.note}</Text>}
              </Box>
            )
          })}
        </>
      )}
    </Box>
  )
}
