import { apiClient } from '@/shared/api/client'

export interface NotificationItem {
  id: number
  notification_type: string
  title: string
  message: string
  link: string
  read: boolean
  created_at: string
  extra_data: Record<string, unknown>
}

export const notificationsApi = {
  list: async (): Promise<NotificationItem[]> => {
    const r = await apiClient.get<NotificationItem[] | { results: NotificationItem[] }>(
      '/notifications/'
    )
    const d = r.data
    return Array.isArray(d) ? d : (d.results ?? [])
  },
  markRead: (id: number) =>
    apiClient.patch(`/notifications/${id}/read/`).then((r) => r.data),
  markAllRead: () =>
    apiClient.post('/notifications/mark_all_read/').then((r) => r.data),
}
