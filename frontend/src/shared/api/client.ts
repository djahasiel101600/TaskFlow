import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/shared/store/auth'

// In the browser use relative URLs so all requests go through the Vite dev proxy (same origin).
// Only use VITE_API_URL for SSR or when window is missing.
const API_BASE =
  typeof window !== 'undefined' ? '' : (import.meta.env.VITE_API_URL || '')

export const apiClient = axios.create({
  baseURL: API_BASE ? API_BASE + '/api' : '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Let the browser set Content-Type with boundary for FormData (e.g. chat file uploads)
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type']
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as (typeof err.config & { _retry?: boolean }) | undefined
    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true
      const refreshed = await useAuthStore.getState().doRefresh()
      if (refreshed && original.headers) {
        const token = useAuthStore.getState().accessToken
        if (token) original.headers.Authorization = `Bearer ${token}`
        return apiClient.request(original)
      }
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
