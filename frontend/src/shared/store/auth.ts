import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const AUTH_URL = import.meta.env.VITE_API_URL || ''

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff?: boolean
  is_superuser?: boolean
  role: number | null
  role_detail?: {
    id: number
    name: string
    can_view_tasks: boolean
    can_create_tasks: boolean
    can_edit_tasks: boolean
    can_delete_tasks: boolean
    can_assign_tasks: boolean
    can_change_task_status: boolean
    can_access_chat: boolean
    can_manage_users: boolean
  }
  is_active: boolean
  date_joined: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setAuth: (access: string, refresh: string, user: User) => void
  logout: () => void
  doRefresh: () => Promise<boolean>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (access, refresh, user) =>
        set({ accessToken: access, refreshToken: refresh, user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
      setUser: (user) => set({ user }),
      doRefresh: async () => {
        const refresh = get().refreshToken
        if (!refresh) return false
        const base = typeof window !== 'undefined' ? '' : AUTH_URL
        try {
          const { data } = await axios.post<{ access: string; user?: User }>(
            `${base}/api/auth/refresh/`,
            { refresh }
          )
          const user = data.user ?? get().user
          set({ accessToken: data.access, user: user ?? get().user })
          return true
        } catch {
          return false
        }
      },
    }),
    { name: 'taskflow-auth', partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }) }
  )
)
