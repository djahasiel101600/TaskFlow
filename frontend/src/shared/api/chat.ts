import { apiClient } from '@/shared/api/client'

export interface ChannelItem {
  id: number
  name: string
  channel_type: string
  members: number[]
  members_detail: { id: number; username: string }[]
  last_message: MessageItem | null
  created_at: string
}

export interface MessageAttachmentItem {
  id: number
  file: string
  filename: string
  created_at: string
}

export interface MessageItem {
  id: number
  channel: number
  sender: number
  sender_detail: { id: number; username: string }
  content: string
  attachments?: MessageAttachmentItem[]
  created_at: string
}

export const chatApi = {
  listChannels: async (): Promise<ChannelItem[]> => {
    const r = await apiClient.get<ChannelItem[] | { results: ChannelItem[] }>('channels/')
    const d = r.data
    return Array.isArray(d) ? d : (d.results ?? [])
  },
  getChannel: (id: number) =>
    apiClient.get<ChannelItem>(`channels/${id}/`).then((r) => r.data),
  listMessages: async (channelId: number): Promise<MessageItem[]> => {
    const r = await apiClient.get<MessageItem[] | { results: MessageItem[] }>(
      `channels/${channelId}/messages/`
    )
    const d = r.data
    return Array.isArray(d) ? d : (d.results ?? [])
  },
  sendMessage: (channelId: number, content: string, files?: File[]) => {
    if (files?.length) {
      const form = new FormData()
      // Backend requires non-empty content; use space when sending only files
      form.append('content', (content && content.trim()) || ' ')
      files.forEach((f) => form.append('attachments', f))
      // Do not set Content-Type: apiClient interceptor removes it for FormData so axios sets multipart/form-data with boundary
      return apiClient.post<MessageItem>(`channels/${channelId}/messages/`, form).then((r) => r.data)
    }
    return apiClient.post<MessageItem>(`channels/${channelId}/messages/`, { content }).then((r) => r.data)
  },
  createChannel: (data: { name?: string; channel_type?: string; members?: number[] }) =>
    apiClient.post<ChannelItem>('channels/', data).then((r) => r.data),
}
