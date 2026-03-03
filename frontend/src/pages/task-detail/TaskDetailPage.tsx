import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { tasksApi } from '@/shared/api/tasks'
import type { Task } from '@/entities/task/model/types'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  Users,
  AlertCircle,
  Trash2,
  Paperclip,
  Loader2,
  MessageSquare,
  Send,
  FileText,
  ImageIcon,
  Link as LinkIcon,
  GitBranch,
  Circle,
  Bell,
} from 'lucide-react'
import { useAuthStore } from '@/shared/store/auth'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { TaskStatus, TaskPriority, TaskCommentItem, TaskLinkItem, TaskStatusHistoryItem, TaskUser } from '@/entities/task/model/types'
import { usersApi } from '@/shared/api/users'
import type { UserMinimal } from '@/shared/api/users'
import { attachmentsApi, type AttachmentItem } from '@/shared/api/attachments'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { buildWebSocketUrl } from '@/shared/lib/websocket'

const STATUSES: TaskStatus[] = ['pending', 'ongoing', 'finished', 'cancelled']

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'])
const PDF_EXT = '.pdf'

function getAttachmentUrl(a: AttachmentItem): string {
  const raw = a.file
  if (raw.startsWith('http')) return raw
  const base = import.meta.env.VITE_API_URL || ''
  return base + (raw.startsWith('/') ? '' : '/') + raw
}

function attachmentPreviewType(filename: string): 'image' | 'pdf' | 'other' {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  if (IMAGE_EXT.has(ext)) return 'image'
  if (ext === PDF_EXT) return 'pdf'
  return 'other'
}
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserMinimal[]>([])
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [links, setLinks] = useState<TaskLinkItem[]>([])
  const [comments, setComments] = useState<TaskCommentItem[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [commentSending, setCommentSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [pdfBlobUrls, setPdfBlobUrls] = useState<Record<number, string>>({})
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkSending, setLinkSending] = useState(false)
  const [statusHistory, setStatusHistory] = useState<TaskStatusHistoryItem[]>([])
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.is_superuser ?? user?.is_staff
  const isCreator = !!task && task.created_by === user?.id
  const canEdit = isCreator || (user?.role_detail?.can_edit_tasks ?? isAdmin)
  const canDelete = isCreator
  const canAssign = user?.role_detail?.can_assign_tasks ?? isAdmin
  const canComment = !!user && !!task && (task.created_by === user.id || (task.assignees && task.assignees.includes(user.id)))

  const load = async () => {
    if (!id) return
    try {
      const t = await tasksApi.get(Number(id))
      setTask(t)
      if (t?.id) {
        attachmentsApi.list(t.id).then(setAttachments).catch(() => setAttachments([]))
        tasksApi.comments.list(t.id).then(setComments).catch(() => setComments([]))
        tasksApi.links.list(t.id).then(setLinks).catch(() => setLinks([]))
        tasksApi.statusHistory(t.id).then(setStatusHistory).catch(() => setStatusHistory([]))
      }
    } catch {
      setTask(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    if (canAssign) usersApi.list().then(setUsers)
  }, [id, canAssign])

  // Real-time comments: subscribe to task comments WebSocket
  const accessToken = useAuthStore((s) => s.accessToken)
  useEffect(() => {
    if (!id || !accessToken) return
    const wsUrl = buildWebSocketUrl(`/ws/task-comments/${id}/`, { token: accessToken })
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data?.type === 'new_comment' && data.comment) {
          const currentUser = useAuthStore.getState().user
          setComments((prev) => {
            if (prev.some((c) => c.id === data.comment.id)) return prev
            // Don't add our own comment from WebSocket — we already added it from the API response on submit
            const authorId = data.comment.author ?? data.comment.author_detail?.id
            if (authorId != null && currentUser?.id != null && authorId === currentUser.id) return prev
            return [...prev, data.comment]
          })
        }
      } catch {}
    }
    return () => ws.close()
  }, [id, accessToken])

  // When any task is updated elsewhere (e.g. status change by another user), refetch this task so the detail view stays in sync
  useEffect(() => {
    const onRefresh = () => load()
    window.addEventListener('taskflow-tasks-refresh', onRefresh)
    return () => window.removeEventListener('taskflow-tasks-refresh', onRefresh)
  }, [id])

  // Fetch PDFs as blob for preview (authenticated); revoke blob URLs when attachments change or unmount
  const pdfIds = attachments
    .filter((a) => attachmentPreviewType(a.filename) === 'pdf')
    .map((a) => a.id)
  useEffect(() => {
    pdfIds.forEach((aid) => {
      if (pdfBlobUrls[aid]) return
      attachmentsApi.getFileBlobUrl(aid).then((url) => {
        if (url) setPdfBlobUrls((prev) => ({ ...prev, [aid]: url }))
      })
    })
    return () => {
      setPdfBlobUrls((prev) => {
        Object.values(prev).forEach((u) => URL.revokeObjectURL(u))
        return {}
      })
    }
  }, [pdfIds.join(',')])

  const handleStatusChange = async (status: TaskStatus) => {
    if (!task) return
    try {
      await tasksApi.update(task.id, { status })
      setTask((prev) => (prev ? { ...prev, status } : null))
      window.dispatchEvent(new CustomEvent('taskflow-overdue-refresh'))
      tasksApi.statusHistory(task.id).then(setStatusHistory).catch(() => {})
    } catch {}
  }

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (!task) return
    try {
      await tasksApi.update(task.id, { priority })
      setTask((prev) => (prev ? { ...prev, priority } : null))
    } catch {}
  }

  const handleReminderChange = async (value: string | null) => {
    if (!task) return
    const reminder_datetime = value ? new Date(value).toISOString() : null
    try {
      await tasksApi.update(task.id, { reminder_datetime })
      setTask((prev) => (prev ? { ...prev, reminder_datetime } : null))
    } catch {}
  }

  const handleAssigneesChange = async (newAssigneeIds: number[]) => {
    if (!task) return
    const prevAssignees = task.assignees ?? []
    const prevDetail = task.assignees_detail ?? []
    setTask((prev) => {
      if (!prev) return null
      const detail = newAssigneeIds.map((id) => prevDetail.find((u) => u.id === id) ?? users.find((u) => u.id === id)).filter(Boolean) as TaskUser[]
      return { ...prev, assignees: newAssigneeIds, assignees_detail: detail.length ? detail : prevDetail.filter((u) => newAssigneeIds.includes(u.id)) }
    })
    try {
      const updated = await tasksApi.update(task.id, { assignees: newAssigneeIds })
      const ids = Array.isArray(updated.assignees)
        ? (updated.assignees as unknown[]).map((a) => (typeof a === 'object' && a !== null && 'id' in a ? (a as { id: number }).id : Number(a)))
        : newAssigneeIds
      const detail = updated.assignees_detail ?? task.assignees_detail ?? []
      setTask((prev) => (prev ? { ...prev, assignees: ids, assignees_detail: detail } : null))
    } catch {
      setTask((prev) => (prev ? { ...prev, assignees: prevAssignees, assignees_detail: prevDetail } : null))
    }
  }

  const toggleAssignee = (userId: number) => {
    if (!task) return
    const current = task.assignees ?? []
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]
    handleAssigneesChange(next)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task?.id || !commentBody.trim()) return
    setCommentSending(true)
    try {
      const c = await tasksApi.comments.create(task.id, commentBody.trim())
      setComments((prev) => [...prev, c])
      setCommentBody('')
    } catch {}
    finally {
      setCommentSending(false)
    }
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task?.id || !linkUrl.trim()) return
    setLinkSending(true)
    try {
      const link = await tasksApi.links.create(task.id, {
        url: linkUrl.trim(),
        label: linkLabel.trim() || undefined,
      })
      setLinks((prev) => [link, ...prev])
      setLinkUrl('')
      setLinkLabel('')
    } catch {}
    finally {
      setLinkSending(false)
    }
  }

  const handleDeleteLink = async (linkId: number) => {
    if (!task?.id) return
    try {
      await tasksApi.links.delete(task.id, linkId)
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    } catch {}
  }

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task?.id || !e.target.files?.length) return
    setUploading(true)
    try {
      const file = e.target.files[0]
      const a = await attachmentsApi.upload(task.id, file)
      setAttachments((prev) => [a, ...prev])
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteAttachment = async (attId: number) => {
    if (!confirm('Delete this attachment?')) return
    try {
      await attachmentsApi.delete(attId)
      setAttachments((prev) => prev.filter((a) => a.id !== attId))
    } catch {}
  }

  const handleDelete = async () => {
    if (!task || !confirm('Delete this task?')) return
    try {
      await tasksApi.delete(task.id)
      navigate('/tasks', { replace: true })
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading task…</p>
        </div>
      </div>
    )
  }
  if (!task) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16 px-4">
        <p className="text-muted-foreground font-medium">Task not found.</p>
        <Button variant="link" className="mt-3" asChild>
          <Link to="/tasks">← Back to tasks</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      {/* Header row: back + title + delete */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" className="rounded-lg shrink-0 h-9 w-9" asChild>
          <Link to="/tasks" aria-label="Back to tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex-1 min-w-0 truncate text-foreground">
          {task.title}
        </h1>
        {canDelete && (
          <Button variant="destructive" size="sm" className="rounded-lg shrink-0" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      <Card className={cn('transition-default', task.is_overdue && 'border-destructive/40')}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={task.priority} onValueChange={(v) => handlePriorityChange(v as TaskPriority)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {!canEdit && (
              <>
                <Badge>{task.status}</Badge>
                <Badge variant="secondary">{task.priority}</Badge>
              </>
            )}
            {task.is_overdue && (
              <span className="inline-flex items-center gap-1 text-destructive text-sm font-medium">
                <AlertCircle className="h-4 w-4" /> Overdue
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {task.description && (
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{task.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            {task.deadline && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                Deadline: {format(new Date(task.deadline), 'PPp')}
              </span>
            )}
            {task.reminder_datetime && !canEdit && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Bell className="h-4 w-4 shrink-0" />
                Reminder: {format(new Date(task.reminder_datetime), 'PPp')}
              </span>
            )}
            {canEdit && (
              <span className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <Bell className="h-4 w-4" />
                  Reminder:
                </label>
                <Input
                  type="datetime-local"
                  className="h-9 w-44 text-sm"
                  value={
                    task.reminder_datetime
                      ? format(new Date(task.reminder_datetime), "yyyy-MM-dd'T'HH:mm")
                      : ''
                  }
                  onChange={(e) => {
                    const v = e.target.value
                    handleReminderChange(v || null)
                  }}
                />
                {task.reminder_datetime && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground"
                    onClick={() => handleReminderChange(null)}
                  >
                    Clear
                  </Button>
                )}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2 w-full">
              <Users className="h-4 w-4 shrink-0" />
              {canAssign ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(task.assignees_detail ?? []).map((u) => (
                    <Badge key={u.id} variant="secondary" className="pr-1">
                      {u.username}
                    </Badge>
                  ))}
                  <details className="relative">
                    <summary className="list-none cursor-pointer text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1 -mx-1">
                      Edit assignees
                    </summary>
                    <div className="absolute left-0 top-full z-10 mt-1.5 w-56 rounded-lg border border-border bg-popover p-2 shadow-lg max-h-48 overflow-auto">
                      {users.map((u) => {
                        const isChecked = (task.assignees ?? []).includes(u.id)
                        return (
                          <label
                            key={u.id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded-md px-2 py-2"
                            onClick={(e) => {
                              e.preventDefault()
                              toggleAssignee(u.id)
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              tabIndex={-1}
                              className="rounded pointer-events-none"
                              aria-checked={isChecked}
                            />
                            <span>{u.username}</span>
                          </label>
                        )
                      })}
                    </div>
                  </details>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {(task.assignees_detail ?? []).length > 0
                    ? (task.assignees_detail ?? []).map((u) => u.username).join(', ')
                    : 'Unassigned'}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs pt-0.5">
              Created by {task.created_by_detail?.username ?? '—'} on{' '}
              {format(new Date(task.created_at), 'PP')}
            </p>
          </div>
          {(canEdit || attachments.length > 0) && (
            <div className="border-t border-border pt-6 mt-2 space-y-4">
              <h3 className="flex items-center gap-2 font-medium text-foreground text-sm">
                <Paperclip className="h-4 w-4 shrink-0" />
                Attachments
              </h3>
              {attachments.length > 0 ? (
                <ul className="space-y-3">
                  {attachments.map((a) => {
                    const url = getAttachmentUrl(a)
                    const type = attachmentPreviewType(a.filename)
                    const linkUrl = type === 'pdf' && pdfBlobUrls[a.id] ? pdfBlobUrls[a.id] : url
                    return (
                      <li key={a.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 p-2 text-sm">
                          <a
                            href={linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline truncate flex items-center gap-2 min-w-0"
                          >
                            {type === 'image' && <ImageIcon className="h-4 w-4 shrink-0" />}
                            {type === 'pdf' && <FileText className="h-4 w-4 shrink-0" />}
                            <span className="truncate">{a.filename}</span>
                          </a>
                          {canEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAttachment(a.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {type === 'image' && (
                          <div
                            className="cursor-pointer p-2 bg-background/50"
                            onClick={() => setPreviewImageUrl(url)}
                          >
                            <img
                              src={url}
                              alt={a.filename}
                              className="max-h-40 w-auto max-w-full object-contain rounded border"
                            />
                          </div>
                        )}
                        {type === 'pdf' && (
                          <div className="p-2 bg-background/50">
                            {pdfBlobUrls[a.id] ? (
                              <iframe
                                src={pdfBlobUrls[a.id]}
                                title={a.filename}
                                className="w-full h-[280px] rounded border bg-white"
                              />
                            ) : (
                              <div className="w-full h-[280px] rounded border bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading PDF…
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : canEdit ? (
                <p className="text-sm text-muted-foreground">No attachments yet.</p>
              ) : null}
              <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto">
                  <DialogHeader>
                    <DialogTitle>Preview</DialogTitle>
                  </DialogHeader>
                  {previewImageUrl && (
                    <img
                      src={previewImageUrl}
                      alt=""
                      className="max-h-[80vh] w-auto max-w-full object-contain"
                    />
                  )}
                </DialogContent>
              </Dialog>
              {canEdit && (
                <div className="pt-1">
                  <input
                    type="file"
                    className="hidden"
                    id="task-attachment-upload"
                    onChange={handleUploadAttachment}
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() =>
                      document.getElementById('task-attachment-upload')?.click()
                    }
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Upload file'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {(canEdit || links.length > 0) && (
            <div className="border-t border-border pt-6 mt-2 space-y-4">
              <h3 className="flex items-center gap-2 font-medium text-foreground text-sm">
                <LinkIcon className="h-4 w-4 shrink-0" />
                Links
              </h3>
              {links.length > 0 ? (
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary hover:underline truncate min-w-0 flex-1"
                      >
                        {l.label || l.url}
                      </a>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLink(l.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : canEdit ? (
                <p className="text-sm text-muted-foreground">No links yet.</p>
              ) : null}
              {canEdit && (
                <form onSubmit={handleAddLink} className="flex flex-wrap gap-2">
                  <Input
                    type="url"
                    placeholder="https://…"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="flex-1 min-w-[200px]"
                    disabled={linkSending}
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Label (optional)"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    className="w-32"
                    disabled={linkSending}
                  />
                  <Button type="submit" size="sm" disabled={linkSending || !linkUrl.trim()}>
                    {linkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add link'}
                  </Button>
                </form>
              )}
            </div>
          )}

          {statusHistory.length > 0 && (
            <div className="border-t border-border pt-6 mt-2 space-y-4">
              <h3 className="flex items-center gap-2 font-medium text-foreground text-sm mb-1">
                <GitBranch className="h-4 w-4 shrink-0" />
                Progress timeline
              </h3>
              <ul className="relative pl-5 border-l-2 border-muted space-y-4">
                {statusHistory.map((entry) => (
                  <li key={entry.id} className="relative flex gap-3 pb-1">
                    <span className="absolute -left-[29px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                      <Circle className="h-2 w-2 fill-current" />
                    </span>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-sm font-medium">
                        {entry.from_status == null ? (
                          <>Task created with status <Badge variant="secondary" className="ml-1">{entry.to_status}</Badge></>
                        ) : (
                          <>
                            <Badge variant="outline" className="mr-1">{entry.from_status}</Badge>
                            <span className="text-muted-foreground mx-1">→</span>
                            <Badge variant="secondary">{entry.to_status}</Badge>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.changed_by?.username ?? 'System'}
                        {' · '}
                        {format(new Date(entry.created_at), 'PPp')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-border pt-6 mt-2 space-y-4">
            <h3 className="flex items-center gap-2 font-medium text-foreground text-sm">
              <MessageSquare className="h-4 w-4 shrink-0" />
              Comments
            </h3>
            {comments.length > 0 ? (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">
                      {c.author_detail?.username ?? 'Unknown'}
                      <span className="text-muted-foreground font-normal ml-2 text-xs">
                        {format(new Date(c.created_at), 'PPp')}
                      </span>
                    </p>
                    <p className="text-sm whitespace-pre-wrap mt-1.5 leading-relaxed">{c.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            {canComment && (
              <form onSubmit={handleAddComment} className="flex gap-2 items-end">
                <textarea
                  placeholder="Write a comment…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={2}
                  className="flex-1 min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  disabled={commentSending}
                />
                <Button type="submit" size="sm" disabled={commentSending || !commentBody.trim()} className="shrink-0">
                  {commentSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
