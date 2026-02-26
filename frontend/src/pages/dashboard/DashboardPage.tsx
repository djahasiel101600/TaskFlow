import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { tasksApi } from '@/shared/api/tasks'
import type { Task } from '@/entities/task/model/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { AlertCircle, Calendar, ListTodo, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { useAuthStore } from '@/shared/store/auth'
import { useNotificationsStore } from '@/shared/store/notifications'

export function DashboardPage() {
  const userId = useAuthStore((s) => s.user?.id)
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [overdue, setOverdue] = useState<Task[]>([])
  const [upcoming, setUpcoming] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const { items: notifications, unreadCount, fetch: fetchNotifications } = useNotificationsStore()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [allRes, myRes] = await Promise.all([
          tasksApi.list({ ordering: '-deadline' }),
          tasksApi.list({ my_tasks: true }),
        ])
        if (cancelled) return
        const my = myRes.results ?? []
        setMyTasks(my)
        const now = new Date().toISOString()
        setOverdue(my.filter((t) => t.is_overdue))
        setUpcoming(
          (allRes.results ?? []).filter(
            (t) => t.deadline && t.deadline > now && !['finished', 'cancelled'].includes(t.status)
          ).slice(0, 5)
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    fetchNotifications()
    return () => { cancelled = true }
  }, [userId, fetchNotifications])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your tasks and activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/tasks?my_tasks=true" className="group">
          <Card className="h-full transition-default hover:shadow-md hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">My Tasks</CardTitle>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                <ListTodo className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{myTasks.length}</p>
              <p className="text-xs text-primary font-medium mt-1 group-hover:underline">View all →</p>
            </CardContent>
          </Card>
        </Link>
        <Link to={overdue.length > 0 ? '/tasks?status=pending' : '#'} className="group">
          <Card className="h-full transition-default hover:shadow-md hover:border-destructive/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-destructive">{overdue.length}</p>
              {overdue.length > 0 && <p className="text-xs text-primary font-medium mt-1 group-hover:underline">View tasks →</p>}
            </CardContent>
          </Card>
        </Link>
        <Card className="h-full transition-default hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</CardTitle>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Calendar className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{upcoming.length}</p>
          </CardContent>
        </Card>
        <Link to="/notifications" className="group">
          <Card className="h-full transition-default hover:shadow-md hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Notifications</CardTitle>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <AlertCircle className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{unreadCount}</p>
              <p className="text-xs text-primary font-medium mt-1 group-hover:underline">View all →</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-default hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Overdue Tasks</CardTitle>
            <p className="text-sm text-muted-foreground">Require immediate attention</p>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 py-10 text-center">
                <p className="text-sm text-muted-foreground">No overdue tasks</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {overdue.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/tasks/${t.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-transparent p-3 transition-default hover:bg-muted/50 hover:border-muted"
                    >
                      <span className="font-medium truncate">{t.title}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="transition-default hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 py-10 text-center">
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {notifications.slice(0, 5).map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-lg border p-3 text-sm transition-default ${!n.read ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50 border-transparent'}`}
                  >
                    <p className="font-medium">{n.title}</p>
                    <p className="text-muted-foreground mt-0.5">{n.message}</p>
                    <time className="text-xs text-muted-foreground mt-1 block">
                      {format(new Date(n.created_at), 'PPp')}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
