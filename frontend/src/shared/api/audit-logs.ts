import { apiClient } from '@/shared/api/client'

export interface AuditLog {
  id: number
  user: number | null
  username: string | null
  action: string
  model_name: string
  object_id: string
  changes: Record<string, unknown>
  created_at: string
}

export interface AuditLogListParams {
  action?: string
  model_name?: string
  user?: number
  page?: number
  page_size?: number
}

interface AuditLogListResponse {
  results: AuditLog[]
  count: number
  next: string | null
  previous: string | null
}

export const auditLogsApi = {
  list: (params?: AuditLogListParams) =>
    apiClient
      .get<AuditLog[] | AuditLogListResponse>('/audit-logs/', { params })
      .then((r) => {
        const d = r.data
        if (Array.isArray(d)) return { results: d, count: d.length }
        return d as AuditLogListResponse
      }),
}
