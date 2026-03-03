import { apiClient } from '@/shared/api/client'

export interface RegisterPayload {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
}

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<{ detail: string }>('auth/register/', data).then((r) => r.data),
}
