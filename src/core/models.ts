// taskboard/packages/core/src/models.ts

export type TaskStatus = 'todo' | 'in_progress' | 'interrupted' | 'done' | 'cancelled'
export type TaskType = 'project' | 'epic' | 'task' | 'objective'
export type OperationType = 'start' | 'progress' | 'complete' | 'error' | 'interrupt'
export type ResourceType = 'input' | 'output' | 'reference' | 'intermediate'

export interface Task {
  id: string
  project_id: string
  type: TaskType
  title: string
  description?: string
  status: TaskStatus
  parent_id?: string
  workflow_id?: string
  todo?: string
  interrupt?: string
  milestone_target?: string
  due_date?: string
  seq_order?: number
  parallel_group?: string
  depends_on?: string[]   // DB에서 JSON 파싱 후
  created_at: string
  updated_at: string
}

export interface Operation {
  id: number
  task_id: string
  operation_type: OperationType
  agent_platform?: string
  workflow_id?: string
  summary?: string
  details?: string
  subagent_used?: number
  subagent_result?: string
  started_at?: string
  completed_at?: string
  created_at: string
  // schema v2 fields
  tool_name?: string
  skill_name?: string
  mcp_name?: string
  retry_count?: number
  input_tokens?: number
  output_tokens?: number
  duration_seconds?: number
}

export interface Resource {
  id: number
  task_id: string
  file_path: string
  description?: string
  res_type: ResourceType
  workflow_id?: string
  created_at: string
}

export interface Setting {
  id: number
  workflow_id: string
  key: string
  value: string
  description?: string
  updated_at: string
}

export interface ProjectInfo {
  id: string
  title: string
  status: TaskStatus
  created_at: string
}

export interface EpicWithTasks {
  epic: Task
  tasks: TaskWithChildren[]
}

export interface TaskWithChildren {
  task: Task
  children: Task[]   // SubTask 목록
}

export interface ProjectSummary {
  project: ProjectInfo
  totalEpics: number
  totalTasks: number
  tasksByStatus: Record<TaskStatus, number>
}

export type WorkflowStatus = 'active' | 'completed' | 'archived'

export interface Workflow {
  id: string
  project_id: string
  title: string
  description?: string
  source_file?: string
  status: WorkflowStatus
  report?: string
  created_at: string
}

export interface Checkpoint {
  id: number
  note?: string
  snapshot: string   // JSON: {task_id: {status, interrupt}}
  created_at: string
}

export type AgentEventType = 'tool_use' | 'tool_result' | 'thinking' | 'subagent_start' | 'subagent_end'

export interface AgentEvent {
  id: number
  session_id?: string
  workflow_id?: string
  task_id?: string
  event_type: AgentEventType
  tool_name?: string
  skill_name?: string
  input_tokens?: number
  output_tokens?: number
  thinking_tokens?: number
  duration_ms?: number
  event_timestamp?: string
  source?: 'hook' | 'jsonl'
  created_at: string
}

export interface TaskProgressSummary {
  id: string
  title: string
  status: TaskStatus
  type: TaskType
  op_count: number
  last_activity: string
  error_count: number
}

export interface CurrentlyInProgressTask {
  id: string
  title: string
  type: TaskType
  latest_summary: string
  agent_platform: string
  last_updated: string
}

export interface WorkflowProgress {
  id: string
  title: string
  total_tasks: number
  done_tasks: number
  active_tasks: number
}

export interface AgentStat {
  tool_name: string
  call_count: number
  avg_duration_ms: number
}
