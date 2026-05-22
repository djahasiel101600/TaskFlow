import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/auth'
import { useNotificationsStore } from '@/shared/store/notifications'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Bell,
  LogOut,
  ClipboardList,
  Users,
  AlertTriangle,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react'
import type { NotificationItem } from '@/shared/api/notifications'
import { playNotificationSound, unlockNotificationSound, showBrowserNotification } from '@/shared/lib/notificationSound'
import { tasksApi } from '@/shared/api/tasks'
import { buildWebSocketUrl } from '@/shared/lib/websocket'
import { useAlarmStore, ALARM_REPEAT_INTERVAL } from '@/shared/store/alarms'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ListTodo, overdueBadge: true },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
  { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList, adminOnly: true },
]

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark' } catch { return false }
  })
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      try { localStorage.setItem('theme', 'dark') } catch {}
    } else {
      document.documentElement.classList.remove('dark')
      try { localStorage.setItem('theme', 'light') } catch {}
    }
  }, [dark])
  return [dark, setDark] as const
}


export function Layout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const fetchNotifications = useNotificationsStore((s) => s.fetch)
  const accessToken = useAuthStore((s) => s.accessToken)
  const doRefresh = useAuthStore((s) => s.doRefresh)
  const wsRef = useRef<WebSocket | null>(null)
  const wsRetryRef = useRef(false)
  const [overdueCount, setOverdueCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const activeAlarmIds = useAlarmStore((s) => s.activeAlarmIds)
  const [darkMode, setDarkMode] = useDarkMode()

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const refreshOverdueCount = () => {
    if (!user) return
    tasksApi.list({ my_tasks: true }).then((res) => {
      const count = (res.results ?? []).filter((t) => t.is_overdue).length
      setOverdueCount(count)
    }).catch(() => setOverdueCount(0))
  }

  useEffect(() => {
    if (!user) {
      setOverdueCount(0)
      return
    }
    let cancelled = false
    tasksApi.list({ my_tasks: true }).then((res) => {
      if (cancelled) return
      const count = (res.results ?? []).filter((t) => t.is_overdue).length
      setOverdueCount(count)
    }).catch(() => { if (!cancelled) setOverdueCount(0) })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!user) return
    const onFocus = () => refreshOverdueCount()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user])

  useEffect(() => {
    const onRefresh = () => refreshOverdueCount()
    window.addEventListener('taskflow-overdue-refresh', onRefresh)
    return () => window.removeEventListener('taskflow-overdue-refresh', onRefresh)
  }, [user])

  useEffect(() => {
    const unlock = () => {
      unlockNotificationSound()
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
    }
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!user || !accessToken) return
    const wsUrl = buildWebSocketUrl('/ws/notifications/', { token: accessToken })
    let cancelled = false
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onopen = () => {
      wsRetryRef.current = false
      if (import.meta.env.DEV) console.debug('[Notifications] WebSocket connected')
    }
    ws.onmessage = (event) => {
      if (cancelled) return
      try {
        const data = JSON.parse(event.data)
        if (data?.type === 'task_list_invalidate') {
          window.dispatchEvent(new CustomEvent('taskflow-tasks-refresh'))
          refreshOverdueCount()
          return
        }
        const payload = data as NotificationItem
        if (payload?.id != null && payload?.title != null) {
          useNotificationsStore.getState().pushOne({
            id: payload.id,
            notification_type: payload.notification_type ?? '',
            title: payload.title,
            message: payload.message ?? '',
            link: payload.link ?? '',
            read: payload.read ?? false,
            created_at: payload.created_at ?? new Date().toISOString(),
            extra_data: payload.extra_data ?? {},
          })
          const isReminderOrDeadline = payload.notification_type === 'reminder' || payload.notification_type === 'deadline'
          const isTaskAssignedOrUpdated = payload.notification_type === 'task_assigned' || payload.notification_type === 'task_updated'
          if (isReminderOrDeadline) playNotificationSound(true)
          else if (isTaskAssignedOrUpdated) playNotificationSound(false)
          if (isTaskAssignedOrUpdated) {
            window.dispatchEvent(new CustomEvent('taskflow-tasks-refresh'))
            refreshOverdueCount()
          }
          if (document.hidden && (isReminderOrDeadline || isTaskAssignedOrUpdated)) {
            showBrowserNotification(payload.title, { body: payload.message ?? '' })
          }
          if (isReminderOrDeadline) {
            useAlarmStore.getState().addAlarm(payload.id)
            startAlarmIntervalIfNeeded()
          }
          if (payload.notification_type === 'deadline') {
            tasksApi.list({ my_tasks: true }).then((res) => {
              const count = (res.results ?? []).filter((t) => t.is_overdue).length
              setOverdueCount(count)
            }).catch(() => {})
          }
        }
      } catch {
        // ignore
      }
    }
    ws.onclose = (event) => {
      wsRef.current = null
      if (import.meta.env.DEV) console.debug('[Notifications] WebSocket closed', event.code, event.reason)
      // Server closed due to auth (4401) or connection failed before open (1006) – try refresh once and reconnect
      if ((event.code === 4401 || event.code === 1006) && !wsRetryRef.current) {
        wsRetryRef.current = true
        doRefresh().then((ok) => {
          if (ok) {
            if (import.meta.env.DEV) console.debug('[Notifications] Token refreshed, will reconnect')
          }
        })
      }
    }
    ws.onerror = () => {}
    return () => {
      cancelled = true
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [user, accessToken, doRefresh])

  // Repeat alarm every minute for reminder/deadline until dismissed or snoozed.
  // Run interval only when there are active alarms; clear when none (avoids wake-ups when idle).
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startAlarmIntervalIfNeeded = useCallback(() => {
    if (alarmIntervalRef.current != null) return
    alarmIntervalRef.current = setInterval(() => {
      const state = useAlarmStore.getState()
      if (state.activeAlarmIds.length === 0) {
        if (alarmIntervalRef.current != null) {
          clearInterval(alarmIntervalRef.current)
          alarmIntervalRef.current = null
        }
        return
      }
      const ids = state.getRingingIds()
      if (ids.length === 0) return
      const items = useNotificationsStore.getState().items
      const byId = new Map(items.map((n) => [n.id, n]))
      ids.forEach((nid) => {
        const n = byId.get(nid)
        if (!n) return
        playNotificationSound(true)
        if (document.hidden) showBrowserNotification(n.title, { body: n.message ?? '' })
      })
    }, ALARM_REPEAT_INTERVAL)
  }, [])

  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current != null) {
        clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
    }
  }, [])

  // Start repeat interval when there are active alarms (e.g. after first alarm or when snooze expires)
  useEffect(() => {
    if (activeAlarmIds.length > 0) startAlarmIntervalIfNeeded()
  }, [activeAlarmIds.length, startAlarmIntervalIfNeeded])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || user?.is_staff || user?.is_superuser || user?.role_detail?.can_manage_users
  )

  const SidebarContent = () => (
    <>
      <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border">
        <NavLink
          to="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 font-semibold text-sidebar-foreground hover:text-primary transition-colors"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ClipboardList className="h-5 w-5" />
          </span>
          <span className="text-lg">TaskFlow</span>
        </NavLink>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {filteredNav.map(({ to, label, icon: Icon, badge, overdueBadge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-border/50 hover:text-sidebar-foreground'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
            {badge && unreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {overdueBadge && overdueCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-medium text-white" title="Overdue tasks">
                {overdueCount > 99 ? '99+' : overdueCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-sidebar-foreground truncate" title={user?.username ?? user?.email}>
            {user?.username ?? user?.email}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-lg h-8 w-8"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out" className="rounded-lg h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30 w-60 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] max-w-[85vw] flex flex-col bg-sidebar border-r border-sidebar-border lg:hidden shadow-xl"
          >
            <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
              <span className="font-semibold text-sidebar-foreground">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-lg">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <nav className="py-4 px-3 space-y-0.5">
                {filteredNav.map(({ to, label, icon: Icon, badge, overdueBadge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        isActive ? 'bg-primary/15 text-primary' : 'text-sidebar-foreground/80 hover:bg-sidebar-border/50'
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{label}</span>
                    {badge && unreadCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {overdueBadge && overdueCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs text-white">
                        {overdueCount > 99 ? '99+' : overdueCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="border-t border-sidebar-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-sidebar-foreground truncate">{user?.username ?? user?.email}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDarkMode((d) => !d)}
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="rounded-lg h-8 w-8"
                  >
                    {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out" className="rounded-lg h-8 w-8">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main workspace area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Top bar: mobile menu + overdue strip */}
        <header className="sticky top-0 z-20 flex flex-col border-b border-border/80 bg-card/95 backdrop-blur-sm shadow-sm">
          <div className="flex h-14 items-center gap-4 px-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-xl"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <NavLink to="/dashboard" className="hidden lg:flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="h-4 w-4" />
              </span>
              <span>TaskFlow</span>
            </NavLink>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground truncate max-w-[160px] lg:max-w-[200px]" title={user?.username ?? user?.email}>
              {user?.username ?? user?.email}
            </span>
          </div>
          {overdueCount > 0 && (
            <div className="border-t border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-amber-600/5">
              <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-2.5">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  {overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}
                </p>
                <NavLink
                  to="/tasks"
                  className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 transition-colors"
                >
                  View tasks
                </NavLink>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto py-6 px-4 lg:px-8">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
