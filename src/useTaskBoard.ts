import { useState, useEffect, useCallback, useRef } from 'react'
import { openDb, closeDb, getProject, getEpicsWithTasks,
         getWorkflowOrder, getOperations, getResources,
         getSettings, getWorkflows, getObjectives, getCheckpoints, watch } from './core/index.js'
import type {
  EpicWithTasks, Operation, Resource, Setting, ProjectInfo,
  Workflow, Task, Checkpoint
} from './core/index.js'

export type Db = ReturnType<typeof openDb>

export type Screen = 'dashboard' | 'taskops' | 'workflows' | 'resources' | 'settings'

interface TaskBoardState {
  project: ProjectInfo | undefined
  epics: EpicWithTasks[]
  operations: Operation[]
  resources: Resource[]
  settings: Setting[]
  workflows: Workflow[]
  objectives: Task[]
  checkpoints: Checkpoint[]
  selectedTaskId: string | null
  selectedWorkflowId: string | null
  screen: Screen
  error: string | null
}

export function useTaskBoard(dbPath: string) {
  const [state, setState] = useState<TaskBoardState>({
    project: undefined, epics: [], operations: [], resources: [],
    settings: [], workflows: [], objectives: [], checkpoints: [],
    selectedTaskId: null, selectedWorkflowId: null, screen: 'dashboard', error: null,
  })

  // Use a ref for the selected workflow ID to avoid dependency loops in reload
  const selectedWorkflowIdRef = useRef<string | null>(null)

  const reload = useCallback(() => {
    let db: ReturnType<typeof openDb> | null = null
    try {
      db = openDb(dbPath)
      const workflows = getWorkflows(db!)
      
      let currentWorkflowId = selectedWorkflowIdRef.current
      if (!currentWorkflowId && workflows.length > 0) {
        currentWorkflowId = workflows[0].id
        selectedWorkflowIdRef.current = currentWorkflowId
      }

      const project = getProject(db!)
      const epics = getEpicsWithTasks(db!, currentWorkflowId || undefined)
      const operations = getOperations(db!, undefined, currentWorkflowId || undefined)
      const resources = getResources(db!, undefined, currentWorkflowId || undefined)
      const settings = getSettings(db!, currentWorkflowId || undefined)
      const objectives = getObjectives(db!)
      const checkpoints = getCheckpoints(db!)

      setState(prev => ({
        ...prev,
        project,
        epics,
        operations,
        resources,
        settings,
        workflows,
        objectives,
        checkpoints,
        selectedWorkflowId: currentWorkflowId,
        error: null,
      }))
    } catch (e) {
      setState(prev => ({ ...prev, error: String(e) }))
    } finally {
      if (db) closeDb(db)
    }
  }, [dbPath])

  useEffect(() => {
    reload()
    const unwatch = watch(dbPath, reload)
    return () => unwatch()
  }, [dbPath, reload])

  const setScreen = (screen: Screen) => setState(prev => ({ ...prev, screen }))
  const setSelectedTask = (id: string | null) => setState(prev => ({ ...prev, selectedTaskId: id }))
  const setSelectedWorkflow = (id: string | null) => {
    selectedWorkflowIdRef.current = id
    setState(prev => ({ ...prev, selectedWorkflowId: id }))
    // reload() is not strictly needed here as the next render will call it via useEffect if dbPath changes,
    // but here dbPath doesn't change, so we might want to trigger a reload manually to refresh data for the new workflow.
    reload()
  }

  return { ...state, reload, setScreen, setSelectedTask, setSelectedWorkflow }
}
