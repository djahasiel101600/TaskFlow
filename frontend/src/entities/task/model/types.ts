export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'ongoing' | 'finished' | 'cancelled'

export interface TaskUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface TaskRole {
  id: number
  name: string
}

export interface Task {
  id: number
  title: string
  description: string
  created_by: number
  created_by_detail: TaskUser
  assigned_to: number | null
  assigned_to_detail: TaskUser | null
  assigned_to_role: number | null
  assigned_to_role_detail: TaskRole | null
  assignees: number[]
  assignees_detail: TaskUser[]
  priority: TaskPriority
  status: TaskStatus
  deadline: string | null
  reminder_datetime: string | null
  created_at: string
  updated_at: string
  is_overdue: boolean
  attachment_count: number
}

export interface TaskCommentItem {
  id: number
  task: number
  author: number
  author_detail: TaskUser
  body: string
  created_at: string
}

export interface TaskLinkItem {
  id: number
  task: number
  url: string
  label: string
  added_by: number | null
  created_at: string
}

export interface TaskStatusHistoryItem {
  id: number
  created_at: string
  changed_by: { id: number; username: string | null } | null
  from_status: TaskStatus | null
  to_status: TaskStatus
}
