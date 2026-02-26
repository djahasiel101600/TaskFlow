import { apiClient } from '@/shared/api/client'

export interface UserMinimal {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface RoleItem {
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

export interface UserFull {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: number | null
  role_detail: RoleItem | null
  is_active: boolean
  is_staff?: boolean
  is_superuser?: boolean
  date_joined: string
}

const AUTH = 'auth'

export const usersApi = {
  list: async (): Promise<UserMinimal[]> => {
    const r = await apiClient.get<UserMinimal[] | { results: UserMinimal[] }>(`${AUTH}/users/`)
    const d = r.data
    return Array.isArray(d) ? d : (d.results ?? [])
  },
  listFull: async (): Promise<UserFull[]> => {
    const r = await apiClient.get<UserFull[] | { results: UserFull[] }>(`${AUTH}/users/`)
    const d = r.data
    return Array.isArray(d) ? d : (d.results ?? [])
  },
  get: (id: number) => apiClient.get<UserFull>(`${AUTH}/users/${id}/`).then((r) => r.data),
  update: (id: number, data: Partial<Pick<UserFull, 'role' | 'is_active' | 'first_name' | 'last_name' | 'email'>>) =>
    apiClient.patch<UserFull>(`${AUTH}/users/${id}/`, data).then((r) => r.data),
  create: (data: { username: string; email: string; password: string; first_name?: string; last_name?: string; role?: number | null; is_active?: boolean }) =>
    apiClient.post<UserFull>(`${AUTH}/users/`, data).then((r) => r.data),
}

export const rolesApi = {
  list: async (): Promise<RoleItem[]> => {
    const r = await apiClient.get<RoleItem[] | { results: RoleItem[] }>(`${AUTH}/roles/`)
    const d = r.data
    return Array.isArray(d) ? d : (d.results ?? [])
  },
}
