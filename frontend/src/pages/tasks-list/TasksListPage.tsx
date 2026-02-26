import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tasksApi } from '@/shared/api/tasks'
import type { Task, TaskStatus } from '@/entities/task/model/types'
import { TaskListView } from '@/widgets/task-list-view'
import { TaskKanbanView } from '@/widgets/task-kanban-view'
import { TaskCalendarView } from '@/widgets/task-calendar-view'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { List, LayoutGrid, Calendar, Plus, Search } from 'lucide-react'
import { CreateTaskDialog } from '@/features/task/create-task'

type ViewMode = 'list' | 'kanban' | 'calendar'

export function TaskListPage() {
  const [searchParams] = useSearchParams()
  const myTasks = searchParams.get('my_tasks') === 'true'
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createWithStatus, setCreateWithStatus] = useState<TaskStatus | undefined>(undefined)

  const load = async () => {
    setLoading(true)
    try {
      const params: Parameters<typeof tasksApi.list>[0] = { my_tasks: myTasks || undefined }
      if (search) params.search = search
      const res = await tasksApi.list(params)
      setTasks(res.results ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [myTasks, search])

  useEffect(() => {
    const onRefresh = () => load()
    window.addEventListener('taskflow-tasks-refresh', onRefresh)
    return () => window.removeEventListener('taskflow-tasks-refresh', onRefresh)
  }, [myTasks, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and track your work</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-lg"
            />
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="shrink-0">
            <TabsList className="rounded-xl bg-muted/80 p-1 gap-0.5 h-11">
              <TabsTrigger value="list" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm px-4">
                <List className="h-4 w-4" /> List
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm px-4">
                <LayoutGrid className="h-4 w-4" /> Board
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm px-4">
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
            onSuccess={() => {
              load()
              setCreateWithStatus(undefined)
            }}
            initialStatus={createWithStatus}
          />
          <Button
            onClick={() => {
              setCreateWithStatus(undefined)
              setCreateOpen(true)
            }}
            className="rounded-xl shadow-sm shrink-0 font-medium"
          >
            <Plus className="h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          </div>
        </div>
      ) : view === 'list' ? (
        <TaskListView tasks={tasks} onUpdate={load} />
      ) : view === 'kanban' ? (
        <TaskKanbanView
          tasks={tasks}
          onUpdate={load}
          onAddTask={(status) => {
            setCreateWithStatus(status)
            setCreateOpen(true)
          }}
        />
      ) : (
        <TaskCalendarView tasks={tasks} onUpdate={load} />
      )}
    </div>
  )
}
