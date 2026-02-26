import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNotificationsStore } from '@/shared/store/notifications'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { format } from 'date-fns'
import { Bell } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function NotificationsPage() {
  const { items, loading, fetch, markAllRead } = useNotificationsStore()

  useEffect(() => {
    let done = false
    async function load() {
      await fetch()
      if (!done) await markAllRead()
    }
    load()
    return () => { done = true }
  }, [fetch, markAllRead])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading notifications…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">Your recent alerts and updates</p>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <Bell className="h-7 w-7" />
            </span>
            <p className="text-muted-foreground font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">You’re all caught up</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id}>
              <Card className={cn(
                'transition-default',
                !n.read && 'border-primary/25 bg-primary/[0.06]'
              )}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <time className="text-xs text-muted-foreground mt-1 block">
                      {format(new Date(n.created_at), 'PPp')}
                    </time>
                  </div>
                  {n.link && (
                    <Button variant="default" size="sm" className="rounded-lg shrink-0" asChild>
                      <Link to={n.link}>View</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
