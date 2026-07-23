import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { Task } from '@/entities/task/model/types'
import { Card, CardContent } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { format } from 'date-fns'
import { AlertCircle, Plus, Search, X, ChevronDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { tasksApi } from '@/shared/api/tasks'
import { Avatar } from '@/shared/ui/avatar'

const STATUS_COLUMNS: { status: Task['status']; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'ongoing', label: 'Ongoing' },
  { status: 'finished', label: 'Finished' },
  { status: 'cancelled', label: 'Cancelled' },
]

const PRIORITIES: Task['priority'][] = ['urgent', 'high', 'medium', 'low']
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

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

const priorityFilterChip: Record<string, string> = {
  low: 'data-[active=true]:bg-slate-600 data-[active=true]:text-white data-[active=true]:border-slate-600',
  medium: 'data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:border-blue-600',
  high: 'data-[active=true]:bg-amber-600 data-[active=true]:text-white data-[active=true]:border-amber-600',
  urgent: 'data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600',
}

type SortKey = 'deadline' | 'priority' | 'title'
type AssigneeLite = { id: number; username: string }

const PAGE_SIZE = 20
const WIP_WARNING_THRESHOLD = 20

interface TaskKanbanViewProps {
  tasks: Task[]
  onUpdate: () => void
  onAddTask?: (status: Task['status']) => void
}

export function TaskKanbanView({ tasks, onUpdate, onAddTask }: TaskKanbanViewProps) {
  const [dragOverStatus, setDragOverStatus] = useState<Task['status'] | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null)

  // Optimistic status overrides: task id -> status. Cleared once `tasks` catches up.
  const [statusOverrides, setStatusOverrides] = useState<Record<number, Task['status']>>({})
  const [failedTaskId, setFailedTaskId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [activePriorities, setActivePriorities] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('deadline')

  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(STATUS_COLUMNS.map(({ status }) => [status, PAGE_SIZE]))
  )

  // Drop an override as soon as the source-of-truth `tasks` prop reflects it (real refetch landed)
  useEffect(() => {
    setStatusOverrides((prev) => {
      const ids = Object.keys(prev)
      if (ids.length === 0) return prev
      const next = { ...prev }
      let changed = false
      for (const idStr of ids) {
        const id = Number(idStr)
        const task = tasks.find((t) => t.id === id)
        if (!task || task.status === prev[id]) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tasks])

  const effectiveStatus = useCallback(
    (t: Task): Task['status'] => statusOverrides[t.id] ?? t.status,
    [statusOverrides]
  )

  const getAssignees = (t: Task): AssigneeLite[] =>
    t.assignees_detail?.length ? t.assignees_detail : t.assigned_to_detail ? [t.assigned_to_detail] : []

  // Filter -> group -> sort, memoized once so 100+ tasks aren't re-scanned on every render
  const grouped = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = tasks.filter((t) => {
      if (activePriorities.size > 0 && !activePriorities.has(t.priority)) return false
      if (!query) return true
      const inTitle = t.title.toLowerCase().includes(query)
      const inAssignee = getAssignees(t).some((u) => u.username.toLowerCase().includes(query))
      return inTitle || inAssignee
    })

    const map = new Map<Task['status'], Task[]>()
    STATUS_COLUMNS.forEach(({ status }) => map.set(status, []))
    filtered.forEach((t) => map.get(effectiveStatus(t))?.push(t))

    for (const list of map.values()) {
      list.sort((a, b) => {
        if (sortKey === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        if (sortKey === 'title') return a.title.localeCompare(b.title)
        // deadline: tasks without one sink to the bottom instead of sorting as "earliest"
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
    }
    return map
  }, [tasks, searchQuery, activePriorities, sortKey, effectiveStatus])

  const togglePriority = (p: string) => {
    setActivePriorities((prev) => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('application/taskflow-task-id', String(taskId))
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '')
    setDraggingTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggingTaskId(null)
    setDragOverStatus(null)
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

  // Shared by drag-drop AND the keyboard status menu on each card
  const moveTask = useCallback(
    (id: number, newStatus: Task['status']) => {
      const task = tasks.find((t) => t.id === id)
      if (!task) return
      const prevStatus = effectiveStatus(task)
      if (prevStatus === newStatus) return

      setFailedTaskId(null)
      setErrorMessage(null)
      setStatusOverrides((prev) => ({ ...prev, [id]: newStatus })) // move instantly

      tasksApi
        .update(id, { status: newStatus })
        .then(() => {
          onUpdate()
          window.dispatchEvent(new CustomEvent('taskflow-overdue-refresh'))
        })
        .catch(() => {
          setStatusOverrides((prev) => ({ ...prev, [id]: prevStatus })) // roll back
          setFailedTaskId(id)
          setErrorMessage(`Couldn't move "${task.title}". Try again.`)
        })
    },
    [tasks, effectiveStatus, onUpdate]
  )

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault()
    setDragOverStatus(null)
    const taskId = e.dataTransfer.getData('application/taskflow-task-id')
    if (!taskId) return
    moveTask(Number(taskId), newStatus)
  }

  const showMore = (status: string) => {
    setVisibleCounts((prev) => ({ ...prev, [status]: prev[status] + PAGE_SIZE }))
  }

  const hasActiveFilter = searchQuery.trim().length > 0 || activePriorities.size > 0

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar: without this, 100+ tasks per column is unnavigable by eye alone */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks or assignees..."
            className="w-full rounded-lg border border-border bg-background pl-8 pr-8 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search tasks"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Filter by priority">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              data-active={activePriorities.has(p)}
              onClick={() => togglePriority(p)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border border-border capitalize transition-default text-muted-foreground hover:text-foreground',
                priorityFilterChip[p]
              )}
              aria-pressed={activePriorities.has(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-border bg-background text-sm px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sort tasks by"
          >
            <option value="deadline">Deadline</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <span>{errorMessage}</span>
          <button
            onClick={() => {
              setErrorMessage(null)
              setFailedTaskId(null)
            }}
            className="text-destructive/70 hover:text-destructive"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 pr-2 snap-x snap-mandatory">
        {STATUS_COLUMNS.map(({ status, label }) => {
          const columnTasks = grouped.get(status) ?? []
          const count = columnTasks.length
          const visibleCount = visibleCounts[status]
          const visibleTasks = columnTasks.slice(0, visibleCount)
          const hasMore = count > visibleCount
          const isDragOver = dragOverStatus === status
          const isOverWip = count > WIP_WARNING_THRESHOLD

          return (
            <div
              key={status}
              role="region"
              aria-label={`${label}, ${count} task${count === 1 ? '' : 's'}`}
              className="min-w-[280px] w-[280px] shrink-0 flex flex-col snap-start"
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div
                className={cn(
                  'sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-xl border-x border-t border-border bg-muted/50 backdrop-blur px-4 py-3',
                  isDragOver && 'bg-primary/10 border-primary/30',
                  isOverWip && !isDragOver && 'bg-amber-50 dark:bg-amber-950/30'
                )}
              >
                <h3 className="font-semibold text-sm text-foreground">{label}</h3>
                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 font-medium tabular-nums',
                    isOverWip && 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                  )}
                >
                  {count}
                </Badge>
              </div>

              {/* Independent scroll per column — this is what keeps a 100-task column from
                  blowing out the page and hiding the other three columns. */}
              <div
                className={cn(
                  'flex-1 space-y-2 min-h-[160px] max-h-[calc(100vh-260px)] overflow-y-auto rounded-b-xl border border-t-0 border-border bg-muted/20 p-3 transition-colors',
                  isDragOver && 'bg-primary/5 border-primary/20 border-t-0'
                )}
              >
                {visibleTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    isDragging={draggingTaskId === t.id}
                    isFailed={failedTaskId === t.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onMove={moveTask}
                    assignees={getAssignees(t)}
                  />
                ))}

                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => showMore(status)}
                  >
                    Show {Math.min(PAGE_SIZE, count - visibleCount)} more ({count - visibleCount} left)
                  </Button>
                )}

                {count === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 text-center">
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilter ? 'No matching tasks' : 'No tasks'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {hasActiveFilter ? 'Try clearing filters' : 'Drag tasks here or add one'}
                    </p>
                    {onAddTask && !hasActiveFilter && (
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

                {isDragOver && count > 0 && (
                  <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 py-3 text-center">
                    <p className="text-xs font-medium text-primary">Drop here</p>
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
    </div>
  )
}

// --- Card is split out so drag-induced re-renders and its own menu state
//     don't force the whole 100+ card board to re-render on every frame. ---

interface TaskCardProps {
  task: Task
  isDragging: boolean
  isFailed: boolean
  onDragStart: (e: React.DragEvent, taskId: number) => void
  onDragEnd: () => void
  onMove: (id: number, status: Task['status']) => void
  assignees: AssigneeLite[]
}

function TaskCard({ task: t, isDragging, isFailed, onDragStart, onDragEnd, onMove, assignees }: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, t.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'transition-default hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20 cursor-grab active:cursor-grabbing border-l-4 relative',
        priorityBorderColors[t.priority] ?? 'border-l-muted-foreground/30',
        t.is_overdue && 'border-destructive/40',
        isDragging && 'opacity-50',
        isFailed && 'ring-2 ring-destructive/40'
      )}
    >
      <CardContent className="p-0">
        <Link
          to={`/tasks/${t.id}`}
          className="block p-3 pr-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-lg"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open task: ${t.title}`}
        >
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <Badge className={cn('text-xs', priorityColors[t.priority] ?? '')}>{t.priority}</Badge>
            {t.is_overdue && (
              <span className="inline-flex items-center gap-0.5 text-destructive text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5" /> Overdue
              </span>
            )}
          </div>
          <p className="font-medium text-sm line-clamp-2 mb-2" title={t.title}>
            {t.title}
          </p>
          <div className="flex items-center justify-between gap-2">
            {t.deadline && (
              <span className="text-xs text-muted-foreground">{format(new Date(t.deadline), 'MMM d')}</span>
            )}
            <div className="flex -space-x-1.5 ml-auto items-center">
              {assignees.slice(0, 3).map((u) => (
                <Avatar key={u.id} name={u.username} size="sm" className="ring-2 ring-card" />
              ))}
              {assignees.length > 3 && (
                <div
                  className="h-6 w-6 rounded-full bg-muted text-[10px] font-medium flex items-center justify-center ring-2 ring-card"
                  title={assignees
                    .slice(3)
                    .map((u) => u.username)
                    .join(', ')}
                >
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Keyboard/screen-reader-accessible status change — native HTML5 drag-and-drop
            has no keyboard equivalent, so without this, moving a task is mouse-only. */}
        <div ref={menuRef} className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Change status for "${t.title}"`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-1 w-32 rounded-lg border border-border bg-card shadow-md py-1 z-20">
              {STATUS_COLUMNS.map(({ status, label }) => (
                <button
                  key={status}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onMove(t.id, status)
                  }}
                  disabled={status === t.status}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-40 disabled:cursor-default',
                    status === t.status && 'font-medium'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
