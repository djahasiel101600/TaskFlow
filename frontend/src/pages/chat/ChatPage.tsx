import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { chatApi, type ChannelItem, type MessageItem, type MessageAttachmentItem } from '@/shared/api/chat'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { format } from 'date-fns'
import { MessageSquare, Send, Plus, Paperclip, X, Users } from 'lucide-react'
import { CreateChannelDialog } from '@/features/chat/create-channel'
import { useAuthStore } from '@/shared/store/auth'
import { Avatar } from '@/shared/ui/avatar'
import { cn } from '@/shared/lib/utils'

function getChannelDisplayName(ch: ChannelItem, currentUserId: number | undefined): string {
  if (ch.channel_type === 'direct' && ch.members_detail?.length) {
    const other = ch.members_detail.find((m) => m.id !== currentUserId)
    if (other) return other.username
  }
  return ch.name || `Channel ${ch.id}`
}

function getChannelSubtitle(ch: ChannelItem, currentUserId: number | undefined): string | null {
  const last = ch.last_message
  if (!last) return null
  const preview = last.content?.slice(0, 40) ?? ''
  return preview + (last.content && last.content.length > 40 ? '…' : '')
}

function getChatAttachmentUrl(filePath: string): string {
  if (!filePath) return '#'
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath
  const base = import.meta.env.VITE_API_URL || ''
  const origin = base ? new URL(base).origin : window.location.origin
  const path = filePath.startsWith('/') ? filePath.slice(1) : filePath
  return `${origin}/media/${path}`
}

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUser = useAuthStore((s) => s.user)
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const loadChannels = () => {
    return chatApi.listChannels().then((list) => setChannels(list))
  }

  useEffect(() => {
    loadChannels().finally(() => setLoading(false))
  }, [])

  const channelIdFromUrl = searchParams.get('channel')
  useEffect(() => {
    if (!channelIdFromUrl || channels.length === 0) return
    const id = Number(channelIdFromUrl)
    if (Number.isInteger(id) && channels.some((c) => c.id === id)) {
      setSelectedId(id)
    }
  }, [channelIdFromUrl, channels])

  const setSelectedChannel = (id: number | null) => {
    setSelectedId(id)
    if (id != null) setSearchParams({ channel: String(id) }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    chatApi.listMessages(selectedId).then((list) => setMessages(list))
  }, [selectedId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!selectedId) return
    const apiOrigin = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).origin
      : (import.meta.env.DEV ? 'http://127.0.0.1:8000' : window.location.origin)
    const wsOrigin = apiOrigin.replace(/^http/, 'ws')
    const wsUrl = `${wsOrigin}/ws/chat/${selectedId}/`
    let cancelled = false
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    const connect = () => {
      if (cancelled) return
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as MessageItem
          if (payload?.id && payload?.content != null) {
            setMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]))
          }
        } catch {
          // ignore
        }
      }
      ws.onclose = () => {
        wsRef.current = null
        if (!cancelled) reconnectTimeout = setTimeout(connect, 2000)
      }
      ws.onerror = () => {}
    }
    connect()
    return () => {
      cancelled = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [selectedId])

  const sendMessage = async () => {
    if (!selectedId || (!input.trim() && !files.length)) return
    setSending(true)
    try {
      await chatApi.sendMessage(selectedId, input.trim() || '', files.length ? files : undefined)
      setInput('')
      setFiles([])
    } finally {
      setSending(false)
    }
  }

  const selectedChannel = selectedId ? channels.find((c) => c.id === selectedId) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading chat…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[420px]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Chat</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Channels and direct messages</p>
        </div>
        <CreateChannelDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={(channel) => {
            setChannels((prev) => (prev.some((c) => c.id === channel.id) ? prev : [channel, ...prev]))
            setSelectedChannel(channel.id)
          }}
        />
        <Button onClick={() => setCreateOpen(true)} className="rounded-xl font-medium shrink-0">
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        <Card className="md:col-span-1 overflow-hidden flex flex-col border-border/80">
          <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <span className="font-semibold text-sm text-foreground">Channels</span>
            </div>
            <ul className="flex-1 overflow-auto p-2 space-y-0.5">
              {channels.length === 0 ? (
                <li className="text-sm text-muted-foreground p-4 rounded-xl bg-muted/30 text-center">
                  No channels yet. Start a new chat to begin.
                </li>
              ) : (
                channels.map((ch) => {
                  const isSelected = selectedId === ch.id
                  const displayName = getChannelDisplayName(ch, currentUser?.id)
                  const subtitle = getChannelSubtitle(ch, currentUser?.id)
                  const isDirect = ch.channel_type === 'direct'
                  const otherMember = isDirect && ch.members_detail?.find((m) => m.id !== currentUser?.id)
                  return (
                    <li key={ch.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedChannel(ch.id)}
                        className={cn(
                          'w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all duration-200',
                          isSelected
                            ? 'bg-primary/15 text-primary shadow-sm'
                            : 'hover:bg-muted/60 text-foreground'
                        )}
                      >
                        {isDirect && otherMember ? (
                          <Avatar name={otherMember.username} size="sm" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Users className="h-4 w-4" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={cn('font-medium text-sm truncate', isSelected && 'text-primary')}>
                            {displayName}
                          </p>
                          {subtitle && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col overflow-hidden border-border/80">
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            {!selectedId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
                  <MessageSquare className="h-8 w-8" />
                </span>
                <p className="font-medium text-foreground">Select a channel</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Choose a conversation from the list or start a new chat.
                </p>
                <Button onClick={() => setCreateOpen(true)} variant="outline" className="mt-4 rounded-xl">
                  <Plus className="h-4 w-4" /> New chat
                </Button>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
                  {selectedChannel && (
                    <>
                      {selectedChannel.channel_type === 'direct' &&
                      selectedChannel.members_detail?.find((m) => m.id !== currentUser?.id) ? (
                        <Avatar
                          name={selectedChannel.members_detail.find((m) => m.id !== currentUser?.id)!.username}
                          size="sm"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Users className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {getChannelDisplayName(selectedChannel, currentUser?.id)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedChannel.channel_type === 'direct' ? 'Direct message' : 'Group channel'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-auto p-4 space-y-4"
                >
                  {messages.map((m) => {
                    const isOwn = m.sender === currentUser?.id
                    const senderName = m.sender_detail?.username ?? 'Unknown'
                    return (
                      <div
                        key={m.id}
                        className={cn('flex gap-3', isOwn && 'flex-row-reverse')}
                      >
                        {!isOwn && (
                          <Avatar name={senderName} size="sm" className="shrink-0 mt-0.5" />
                        )}
                        <div
                          className={cn(
                            'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5',
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted text-foreground rounded-bl-md'
                          )}
                        >
                          {!isOwn && (
                            <p className="text-xs font-medium opacity-90 mb-1">{senderName}</p>
                          )}
                          {m.content?.trim() && (
                            <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                          )}
                          {m.attachments && m.attachments.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {m.attachments.map((a: MessageAttachmentItem) => (
                                <li key={a.id}>
                                  <a
                                    href={getChatAttachmentUrl(a.file)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      'inline-flex items-center gap-1.5 text-sm underline underline-offset-2',
                                      isOwn ? 'text-primary-foreground/90 hover:text-primary-foreground' : 'text-primary hover:text-primary/90'
                                    )}
                                  >
                                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                    {a.filename || 'Attachment'}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                          <p
                            className={cn(
                              'text-xs mt-1',
                              isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            )}
                          >
                            {format(new Date(m.created_at), 'p')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  className="flex flex-col gap-2 p-4 border-t border-border bg-card"
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                >
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-sm"
                        >
                          {f.name}
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="hover:opacity-70 rounded p-0.5"
                            aria-label="Remove file"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        const list = e.target.files ? Array.from(e.target.files) : []
                        setFiles((prev) => [...prev, ...list])
                        e.target.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach files"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message…"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={sending}
                      className="flex-1 rounded-xl border-border"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="rounded-xl"
                      disabled={sending || (!input.trim() && !files.length)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
