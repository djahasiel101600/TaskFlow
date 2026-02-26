import { apiClient } from '@/shared/api/client'

export interface AttachmentItem {
  id: number
  file: string
  filename: string
  task: number | null
  created_at: string
}

export const attachmentsApi = {
  list: (taskId: number) =>
    apiClient
      .get<AttachmentItem[]>('/attachments/', { params: { task_id: taskId } })
      .then((r) => (Array.isArray(r.data) ? r.data : (r.data as { results?: AttachmentItem[] }).results ?? [])),

  upload: (taskId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    form.append('task', String(taskId))
    return apiClient
      .post<AttachmentItem>('/attachments/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  delete: (id: number) => apiClient.delete(`/attachments/${id}/`),

  /** Fetch file as blob for preview (authenticated). Returns blob URL or null on 404; caller must revoke when done. */
  getFileBlobUrl: async (id: number): Promise<string | null> => {
    try {
      const r = await apiClient.get(`/attachments/${id}/file/`, { responseType: 'blob' })
      const blob = r.data as Blob
      return URL.createObjectURL(blob)
    } catch {
      return null
    }
  },
}
