import React, { useState } from 'react'
import { Box, Text } from 'ink'
import type { Key } from 'ink'
import { useSafeInput } from '../useSafeInput.js'
import type { Resource } from '../core/index.js'

const TYPE_COLOR: Record<string, string> = {
  input: 'blue',
  output: 'green',
  reference: 'white',
  intermediate: 'yellow',
}

interface Props {
  resources: Resource[]
}

const PAGE_SIZE = 15

export function Resources({ resources }: Props) {
  const [scrollTop, setScrollTop] = useState(0)

  useSafeInput((input: string, key: Key) => {
    if (key.upArrow) {
      setScrollTop(prev => Math.max(0, prev - 1))
    }
    if (key.downArrow) {
      setScrollTop(prev => Math.min(Math.max(0, resources.length - PAGE_SIZE), prev + 1))
    }
    if (key.pageDown) {
      setScrollTop(prev => Math.min(Math.max(0, resources.length - PAGE_SIZE), prev + PAGE_SIZE))
    }
    if (key.pageUp) {
      setScrollTop(prev => Math.max(0, prev - PAGE_SIZE))
    }
  })

  const visibleResources = resources.slice(scrollTop, scrollTop + PAGE_SIZE)

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between">
        <Text bold>Resources ({resources.length})</Text>
        <Text dimColor>[↑/↓] Scroll  {scrollTop + 1}-{Math.min(scrollTop + PAGE_SIZE, resources.length)} of {resources.length}</Text>
      </Box>
      <Text dimColor>{'─'.repeat(60)}</Text>
      {resources.length === 0 && <Text dimColor>No resources recorded</Text>}
      {visibleResources.map(r => (
        <Box key={r.id} marginBottom={0}>
          <Text color={TYPE_COLOR[r.res_type]}>{r.res_type.padEnd(14)}</Text>
          <Text dimColor>{r.task_id.padEnd(12)}</Text>
          <Text>{r.file_path}</Text>
          {r.description && <Text dimColor>  {r.description}</Text>}
        </Box>
      ))}
    </Box>
  )
}
