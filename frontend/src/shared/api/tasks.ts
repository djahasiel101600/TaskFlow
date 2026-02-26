import { apiClient } from '@/shared/api/client'
import type { Task, TaskCommentItem, TaskLinkItem, TaskStatusHistoryItem } from '@/entities/task/model/types'

export interface TaskListParams {
  my_tasks?: boolean
  status?: string
  priority?: string
  search?: string
  ordering?: string
  page?: number
}

interface TaskListResponse {
  results?: Task[]
  count?: number
  next?: string | null
  previous?: string | null
}

export const tasksApi = {
  list: (params?: TaskListParams) =>
    apiClient.get<Task[] | TaskListResponse>('/tasks/', { params }).then((r) => {
      const d = r.data
      if (Array.isArray(d)) return { results: d, count: d.length }
      return { results: (d as TaskListResponse).results ?? [], count: (d as TaskListResponse).count ?? 0 }
    }),
  get: (id: number) => apiClient.get<Task>(`/tasks/${id}/`).then((r) => r.data),
  create: (data: Partial<Task> & { assignees?: number[] }) => apiClient.post<Task>('/tasks/', data).then((r) => r.data),
  update: (id: number, data: Partial<Task> & { assignees?: number[] }) =>
    apiClient.patch<Task>(`/tasks/${id}/`, data).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/tasks/${id}/`),
  comments: {
    list: (taskId: number) =>
      apiClient
        .get<TaskCommentItem[] | { results: TaskCommentItem[] }>(`/tasks/${taskId}/comments/`)
        .then((r) => (Array.isArray(r.data) ? r.data : (r.data as { results?: TaskCommentItem[] }).results ?? [])),
    create: (taskId: number, body: string) =>
      apiClient.post<TaskCommentItem>(`/tasks/${taskId}/comments/`, { body }).then((r) => r.data),
  },
  links: {
    list: (taskId: number) =>
      apiClient
        .get<TaskLinkItem[] | { results: TaskLinkItem[] }>(`/tasks/${taskId}/links/`)
        .then((r) => (Array.isArray(r.data) ? r.data : (r.data as { results?: TaskLinkItem[] }).results ?? [])),
    create: (taskId: number, data: { url: string; label?: string }) =>
      apiClient.post<TaskLinkItem>(`/tasks/${taskId}/links/`, data).then((r) => r.data),
    delete: (taskId: number, linkId: number) =>
      apiClient.delete(`/tasks/${taskId}/links/${linkId}/`),
  },
  statusHistory: (taskId: number) =>
    apiClient.get<TaskStatusHistoryItem[]>(`/tasks/${taskId}/status_history/`).then((r) => r.data),
}
