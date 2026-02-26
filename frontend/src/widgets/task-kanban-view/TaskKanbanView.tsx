import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Task } from '@/entities/task/model/types'
import { Card, CardContent } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { format } from 'date-fns'
import { AlertCircle, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { tasksApi } from '@/shared/api/tasks'
import { Avatar } from '@/shared/ui/avatar'

const STATUS_COLUMNS: { status: Task['status']; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'ongoing', label: 'Ongoing' },
  { status: 'finished', label: 'Finished' },
  { status: 'cancelled', label: 'Cancelled' },
]

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
}

const priorityBorderColors: Record<string, string> = {
  low: 'border-l-slate-400',
  medium: 'border-l-blue-500',
  high: 'border-l-amber-500',
  urgent: 'border-l-red-500',
}

interface TaskKanbanViewProps {
  tasks: Task[]
  onUpdate: () => void
  onAddTask?: (status: Task['status']) => void
}

export function TaskKanbanView({ tasks, onUpdate, onAddTask }: TaskKanbanViewProps) {
  const navigate = useNavigate()
  const [dragOverStatus, setDragOverStatus] = useState<Task['status'] | null>(null)

  const byStatus = (status: Task['status']) => tasks.filter((t) => t.status === status)

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('application/taskflow-task-id', String(taskId))
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // some browsers need this for drag image
  }

  const handleDragOver = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null)
  }

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault()
    setDragOverStatus(null)
    const taskId = e.dataTransfer.getData('application/taskflow-task-id')
    if (!taskId) return
    const id = Number(taskId)
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === newStatus) return
    tasksApi.update(id, { status: newStatus }).then(() => {
      onUpdate()
      window.dispatchEvent(new CustomEvent('taskflow-overdue-refresh'))
    }).catch(() => {})
  }

  const assignees = (t: Task) =>
    (t.assignees_detail?.length ? t.assignees_detail : t.assigned_to_detail ? [t.assigned_to_detail] : [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
      {STATUS_COLUMNS.map(({ status, label }) => {
        const count = byStatus(status).length
        const isDragOver = dragOverStatus === status
        return (
          <div
            key={status}
            className="min-w-[280px] flex flex-col"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div
              className={cn(
                'flex items-center justify-between gap-2 rounded-t-xl border-x border-t border-border bg-muted/50 px-4 py-3',
                isDragOver && 'bg-primary/10 border-primary/30'
              )}
            >
              <h3 className="font-semibold text-sm text-foreground">{label}</h3>
              <Badge variant="secondary" className="shrink-0 font-medium tabular-nums">
                {count}
              </Badge>
            </div>
            <div
              className={cn(
                'flex-1 space-y-2 min-h-[140px] rounded-b-xl border border-t-0 border-border bg-muted/20 p-3 transition-colors',
                isDragOver && 'bg-primary/5 border-primary/20 border-t-0'
              )}
            >
              {byStatus(status).map((t) => (
                <Card
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  className={cn(
                    'transition-default hover:shadow-md hover:border-primary/20 cursor-grab active:cursor-grabbing border-l-4',
                    priorityBorderColors[t.priority] ?? 'border-l-muted-foreground/30',
                    t.is_overdue && 'border-destructive/40'
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <Badge className={cn('text-xs', priorityColors[t.priority] ?? '')}>
                        {t.priority}
                      </Badge>
                      {t.is_overdue && (
                        <span className="inline-flex items-center gap-0.5 text-destructive text-xs font-medium">
                          <AlertCircle className="h-3.5 w-3.5" /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm line-clamp-2 mb-2">{t.title}</p>
                    <div className="flex items-center justify-between gap-2">
                      {t.deadline && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(t.deadline), 'MMM d')}
                        </span>
                      )}
                      <div className="flex -space-x-1.5 ml-auto">
                        {assignees(t).slice(0, 3).map((u) => (
                          <Avatar key={u.id} name={u.username} size="sm" className="ring-2 ring-card" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {count === 0 && (
                <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 text-center">
                  <p className="text-sm text-muted-foreground">No tasks</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Drop here or add one</p>
                  {onAddTask && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 rounded-lg text-primary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddTask(status)
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add task
                    </Button>
                  )}
                </div>
              )}
              {count > 0 && onAddTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-lg text-muted-foreground hover:text-foreground justify-center gap-1.5"
                  onClick={() => onAddTask(status)}
                >
                  <Plus className="h-4 w-4" /> Add task
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
