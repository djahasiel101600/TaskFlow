import { create } from 'zustand'
import type { NotificationItem } from '@/shared/api/notifications'
import { notificationsApi } from '@/shared/api/notifications'

interface NotificationsState {
  items: NotificationItem[]
  unreadCount: number
  loading: boolean
  fetch: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
  pushOne: (n: NotificationItem) => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  fetch: async () => {
    set({ loading: true })
    try {
      const items = await notificationsApi.list()
      const unreadCount = items.filter((n) => !n.read).length
      set({ items, unreadCount })
    } finally {
      set({ loading: false })
    }
  },
  markRead: async (id: number) => {
    await notificationsApi.markRead(id)
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
  },
  markAllRead: async () => {
    await notificationsApi.markAllRead()
    set((s) => ({
      items: s.items.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },
  pushOne: (n: NotificationItem) => {
    set((s) => ({
      items: [n, ...s.items.filter((x) => x.id !== n.id)],
      unreadCount: n.read ? s.unreadCount : s.unreadCount + 1,
    }))
  },
}))
