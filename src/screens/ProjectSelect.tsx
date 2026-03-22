import React, { useState } from 'react'
import { Box, Text } from 'ink'
import type { Key } from 'ink'
import TextInput from 'ink-text-input'
import { getProjectList } from '../core/index.js'
import { useSafeInput } from '../useSafeInput.js'
import { App } from '../App.js'
import path from 'path'

interface Props {
  taskopsRoot: string | null
}

export function ProjectSelect({ taskopsRoot }: Props) {
  const [rootPath, setRootPath] = useState(taskopsRoot ?? '')
  const [submitted, setSubmitted] = useState(!!taskopsRoot)
  const [selectedDbPath, setSelectedDbPath] = useState<string | null>(null)

  if (selectedDbPath) {
    return <App dbPath={selectedDbPath} />
  }

  if (!submitted) {
    return (
      <PathInput
        value={rootPath}
        onChange={setRootPath}
        onSubmit={() => setSubmitted(true)}
      />
    )
  }

  const projects = getProjectList(path.resolve(rootPath))

  if (projects.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">No projects found in: {rootPath}</Text>
        <Text dimColor>Make sure the folder contains TaskOps projects (with taskops.db)</Text>
        <Box marginTop={1}>
          <Text dimColor>[B] Back to path input</Text>
        </Box>
      </Box>
    )
  }

  return (
    <ProjectList 
      projects={projects} 
      onBack={() => setSubmitted(false)} 
      onSelect={setSelectedDbPath}
    />
  )
}

function PathInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>TaskBoard</Text>
      <Text dimColor>Enter TaskOps root path (e.g. C:\Projects):</Text>
      <Box marginTop={1}>
        <Text>{'> '}</Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[Enter] Submit  [Esc/Ctrl+C] Exit</Text>
      </Box>
    </Box>
  )
}

function ProjectList({ 
  projects, 
  onBack,
  onSelect
}: { 
  projects: Array<{ name: string; dbPath: string }>,
  onBack: () => void,
  onSelect: (dbPath: string) => void
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)

  useSafeInput((input: string, key: Key) => {
    if (key.upArrow) setSelectedIdx(i => Math.max(0, i - 1))
    if (key.downArrow) setSelectedIdx(i => Math.min(projects.length - 1, i + 1))
    if (key.return) {
      onSelect(projects[selectedIdx].dbPath)
    }
    if (input === 'b' || input === 'B') {
      onBack()
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select Project:</Text>
      <Text dimColor>[↑↓] navigate, [Enter] select, [B] back</Text>
      <Box flexDirection="column" marginTop={1}>
        {projects.map((p, i) => (
          <Box key={p.name}>
            <Text color={i === selectedIdx ? 'cyan' : 'white'}>
              {i === selectedIdx ? '▶ ' : '  '}{p.name}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
