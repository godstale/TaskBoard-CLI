import { useState, useEffect, useCallback } from 'react'
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
  screen: Screen
  error: string | null
}

export function useTaskBoard(dbPath: string) {
  const [state, setState] = useState<TaskBoardState>({
    project: undefined, epics: [], operations: [], resources: [],
    settings: [], workflows: [], objectives: [], checkpoints: [],
    selectedTaskId: null, screen: 'dashboard', error: null,
  })

  const reload = useCallback(() => {
    let db: ReturnType<typeof openDb> | null = null
    try {
      db = openDb(dbPath)
      setState(prev => ({
        ...prev,
        project: getProject(db!),
        epics: getEpicsWithTasks(db!),
        operations: getOperations(db!),
        resources: getResources(db!),
        settings: getSettings(db!),
        workflows: getWorkflows(db!),
        objectives: getObjectives(db!),
        checkpoints: getCheckpoints(db!),
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

  return { ...state, reload, setScreen, setSelectedTask }
}
