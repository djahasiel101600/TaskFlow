import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tasksApi } from '@/shared/api/tasks'
import type { Task, TaskStatus, TaskPriority } from '@/entities/task/model/types'
import { TaskListView } from '@/widgets/task-list-view'
import { TaskKanbanView } from '@/widgets/task-kanban-view'
import { TaskCalendarView } from '@/widgets/task-calendar-view'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { List, LayoutGrid, Calendar, Plus, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { CreateTaskDialog } from '@/features/task/create-task'

type ViewMode = 'list' | 'kanban' | 'calendar'

const TASKS_VIEW_STORAGE_KEY = 'taskflow-tasks-view'
const PAGE_SIZE = 20

function getStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'list'
  try {
    const v = localStorage.getItem(TASKS_VIEW_STORAGE_KEY)
    if (v === 'list' || v === 'kanban' || v === 'calendar') return v
  } catch {}
  return 'list'
}

export function TaskListPage() {
  const [searchParams] = useSearchParams()
  const myTasks = searchParams.get('my_tasks') === 'true'
  const [tasks, setTasks] = useState<Task[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>(getStoredViewMode)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createWithStatus, setCreateWithStatus] = useState<TaskStatus | undefined>(undefined)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all'

  const handleViewChange = (value: string) => {
    const mode = value as ViewMode
    setView(mode)
    try { localStorage.setItem(TASKS_VIEW_STORAGE_KEY, mode) } catch {}
  }

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const params: Parameters<typeof tasksApi.list>[0] = {
        my_tasks: myTasks || undefined,
        page: p,
      }
      if (search) params.search = search
      if (statusFilter !== 'all') params.status = statusFilter
      if (priorityFilter !== 'all') params.priority = priorityFilter
      const res = await tasksApi.list(params)
      setTasks(res.results ?? [])
      setTotalCount(res.count ?? 0)
    } finally {
      setLoading(false)
    }
  }, [myTasks, search, statusFilter, priorityFilter, page])

  useEffect(() => {
    setPage(1)
  }, [myTasks, search, statusFilter, priorityFilter])

  useEffect(() => {
    load(page)
  }, [myTasks, search, statusFilter, priorityFilter, page])

  useEffect(() => {
    const onRefresh = () => load(page)
    window.addEventListener('taskflow-tasks-refresh', onRefresh)
    return () => window.removeEventListener('taskflow-tasks-refresh', onRefresh)
  }, [load, page])

  const clearFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setSearch('')
  }

  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {totalCount > 0 ? `${totalCount} task${totalCount !== 1 ? 's' : ''}` : 'Manage and track your work'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-52 min-w-[130px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-lg"
            />
            {search && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <Button
            variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
            size="sm"
            className="rounded-lg h-10 gap-1.5 shrink-0"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {(statusFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </Button>

          {/* View mode */}
          <Tabs value={view} onValueChange={handleViewChange} className="shrink-0">
            <TabsList className="rounded-xl bg-muted/80 p-1 gap-0.5 h-10">
              <TabsTrigger value="list" className="gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm px-3 text-sm">
                <List className="h-4 w-4" /> List
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm px-3 text-sm">
                <LayoutGrid className="h-4 w-4" /> Board
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm px-3 text-sm">
                <Calendar className="h-4 w-4" /> Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <CreateTaskDialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open)
              if (!open) setCreateWithStatus(undefined)
            }}
            onSuccess={() => { load(1); setCreateWithStatus(undefined) }}
            initialStatus={createWithStatus}
          />
          <Button
            onClick={() => { setCreateWithStatus(undefined); setCreateOpen(true) }}
            className="rounded-xl shadow-sm shrink-0 font-medium h-10"
          >
            <Plus className="h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium text-foreground shrink-0">Filter by:</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
            <SelectTrigger className="w-36 h-9 rounded-lg text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="finished">Finished</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | 'all')}>
            <SelectTrigger className="w-36 h-9 rounded-lg text-sm">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Task views */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          </div>
        </div>
      ) : view === 'list' ? (
        <TaskListView tasks={tasks} onUpdate={() => load(page)} />
      ) : view === 'kanban' ? (
        <TaskKanbanView
          tasks={tasks}
          onUpdate={() => load(page)}
          onAddTask={(status) => { setCreateWithStatus(status); setCreateOpen(true) }}
        />
      ) : (
        <TaskCalendarView tasks={tasks} onUpdate={() => load(page)} />
      )}

      {/* Pagination — only show in list view and when there's more than one page */}
      {!loading && view === 'list' && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {totalCount} task{totalCount !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const pageNum = start + i
              return pageNum <= totalPages ? (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg text-xs"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ) : null
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
