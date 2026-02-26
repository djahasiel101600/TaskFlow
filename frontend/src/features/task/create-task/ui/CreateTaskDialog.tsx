import { useState, useEffect } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { tasksApi } from '@/shared/api/tasks'
import { useAuthStore } from '@/shared/store/auth'
import { usersApi } from '@/shared/api/users'
import type { TaskPriority, TaskStatus } from '@/entities/task/model/types'

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  /** When opening from Kanban, pre-fill this status. */
  initialStatus?: TaskStatus
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const STATUSES: TaskStatus[] = ['pending', 'ongoing', 'finished', 'cancelled']

export function CreateTaskDialog({ open, onOpenChange, onSuccess, initialStatus }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>(initialStatus ?? 'pending')
  const [assigneeIds, setAssigneeIds] = useState<number[]>([])
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<{ id: number; username: string }[]>([])
  const [assignLoading, setAssignLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const canAssign =
    user?.role_detail?.can_assign_tasks ?? user?.is_staff ?? user?.is_superuser

  const loadUsers = async () => {
    setAssignLoading(true)
    try {
      const uList = await usersApi.list()
      setUsers(uList.map((u) => ({ id: u.id, username: u.username })))
    } catch {
      setUsers([])
    } finally {
      setAssignLoading(false)
    }
  }

  const toggleAssignee = (userId: number) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleOpen = (o: boolean) => {
    if (o) {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setStatus(initialStatus ?? 'pending')
      setAssigneeIds([])
      setDeadline('')
      setError('')
    }
    onOpenChange(o)
  }

  useEffect(() => {
    if (open && canAssign) loadUsers()
  }, [open, canAssign])

  useEffect(() => {
    if (open && initialStatus != null) setStatus(initialStatus)
  }, [open, initialStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await tasksApi.create({
        title,
        description,
        priority,
        status,
        assignees: assigneeIds.length ? assigneeIds : undefined,
        deadline: deadline || null,
      })
      onSuccess()
      handleOpen(false)
    } catch (err: unknown) {
      const ax = err as { response?: { data?: Record<string, string[]> } }
      const msg = ax.response?.data
      setError(
        msg && typeof msg === 'object'
          ? Object.entries(msg)
              .flatMap(([, v]) => (Array.isArray(v) ? v : [String(v)]))
              .join(' ')
          : 'Failed to create task'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
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
            </div>
          </div>
          {canAssign && (
            <div className="space-y-2">
              <Label>Assign to (multiple)</Label>
              {assignLoading ? (
                <p className="text-sm text-muted-foreground">Loading users…</p>
              ) : (
                <div className="max-h-40 overflow-auto rounded-md border p-2 space-y-1.5">
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={assigneeIds.includes(u.id)}
                        onChange={() => toggleAssignee(u.id)}
                        className="rounded"
                      />
                      {u.username}
                    </label>
                  ))}
                  {users.length === 0 && (
                    <p className="text-sm text-muted-foreground">No users available.</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
