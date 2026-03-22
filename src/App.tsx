import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Key } from 'ink'
import { useTaskBoard, Screen } from './useTaskBoard.js'
import { useSafeInput } from './useSafeInput.js'
import { Dashboard } from './screens/Dashboard.js'
import { TaskOperations } from './screens/TaskOperations.js'
import { Workflows } from './screens/Workflows.js'
import { Resources } from './screens/Resources.js'
import { Settings } from './screens/Settings.js'

const SCREENS: Screen[] = ['workflows', 'dashboard', 'taskops', 'resources', 'settings']
const SCREEN_LABELS: Record<Screen, string> = {
  workflows: 'Workflows',
  dashboard: 'Dashboard',
  taskops: 'Task Ops',
  resources: 'Resources',
  settings: 'Settings',
}

interface Props {
  dbPath: string
}

export function App({ dbPath }: Props) {
  const board = useTaskBoard(dbPath)

  useSafeInput((input: string, key: Key) => {
    if (input === 'q' || input === 'Q') process.exit(0)
    if (input === 'r' || input === 'R') board.reload()
    if (key.tab) {
      // Prevent switching away from workflows if no workflow is selected
      if (!board.selectedWorkflowId && board.screen === 'workflows') {
        return
      }
      const idx = SCREENS.indexOf(board.screen)
      if (key.shift) {
        board.setScreen(SCREENS[(idx - 1 + SCREENS.length) % SCREENS.length])
      } else {
        board.setScreen(SCREENS[(idx + 1) % SCREENS.length])
      }
    }
  })

  // Ensure user is on Workflows screen if no selection exists
  useEffect(() => {
    if (!board.selectedWorkflowId && board.screen !== 'workflows') {
      board.setScreen('workflows')
    }
  }, [board.selectedWorkflowId, board.screen])

  if (board.error) {
    return <Text color="red">Error: {board.error}</Text>
  }

  const selectedWorkflow = board.workflows.find(w => w.id === board.selectedWorkflowId)

  return (
    <Box flexDirection="column" height="100%">
      {/* Header with Project and Workflow info */}
      <Box paddingX={1} justifyContent="space-between">
        <Box>
          <Text bold color="yellow">{board.project?.title || 'No Project'}</Text>
          <Text dimColor> | </Text>
          <Text color="green">Workflow: {selectedWorkflow?.title || 'None selected'}</Text>
          {selectedWorkflow?.id && <Text dimColor> ({selectedWorkflow.id})</Text>}
        </Box>
        <Box>
          <Text dimColor>[Tab/Shift+Tab] Switch [R] Reload [Q] Quit</Text>
        </Box>
      </Box>

      {/* Tab navigation */}
      <Box borderStyle="single" paddingX={1}>
        {SCREENS.map((s) => {
          const isLocked = !board.selectedWorkflowId && s !== 'workflows'
          return (
            <Box key={s} marginRight={2}>
              <Text
                color={isLocked ? 'gray' : (board.screen === s ? 'cyan' : 'white')}
                bold={board.screen === s}
                dimColor={isLocked}
              >
                {board.screen === s ? `[${SCREEN_LABELS[s]}]` : SCREEN_LABELS[s]}
                {isLocked ? ' 🔒' : ''}
              </Text>
            </Box>
          )
        })}
      </Box>

      {/* Screen content */}
      <Box flexGrow={1} flexDirection="column" key={board.screen}>
        {board.screen === 'dashboard' && <Dashboard {...board} />}
        {board.screen === 'taskops' && <TaskOperations {...board} />}
        {board.screen === 'workflows' && (
          <Workflows 
            workflows={board.workflows} 
            selectedWorkflowId={board.selectedWorkflowId}
            onSelectWorkflow={(id) => {
              board.setSelectedWorkflow(id)
              if (id) board.setScreen('dashboard')
            }}
          />
        )}
        {board.screen === 'resources' && <Resources resources={board.resources} />}
        {board.screen === 'settings' && <Settings settings={board.settings} checkpoints={board.checkpoints} />}
      </Box>
    </Box>
  )
}
