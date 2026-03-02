import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNotificationsStore } from '@/shared/store/notifications'
import { useAlarmStore } from '@/shared/store/alarms'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { format } from 'date-fns'
import { Bell } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function NotificationsPage() {
  const { items, loading, fetch, markRead, markAllRead } = useNotificationsStore()
  const { activeAlarmIds, snoozedUntil, dismissAlarm, snoozeAlarm, dismissAllAlarms } = useAlarmStore()

  useEffect(() => {
    fetch()
  }, [fetch])

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Your recent alerts and updates</p>
        </div>
        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              markAllRead()
              dismissAllAlarms()
            }}
            className="shrink-0"
          >
            Mark all read
          </Button>
        )}
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
          {items.map((n) => {
            const isAlarmType = n.notification_type === 'reminder' || n.notification_type === 'deadline'
            const isAlarming = isAlarmType && activeAlarmIds.includes(n.id)
            const snoozeEnd = snoozedUntil[n.id]
            const isSnoozed = snoozeEnd != null && Date.now() < snoozeEnd
            return (
              <li key={n.id}>
                <Card className={cn(
                  'transition-default',
                  !n.read && 'border-primary/25 bg-primary/[0.06]',
                  isAlarming && 'ring-2 ring-primary/50'
                )}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      <time className="text-xs text-muted-foreground mt-1 block">
                        {format(new Date(n.created_at), 'PPp')}
                      </time>
                      {isSnoozed && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Snoozed until {format(new Date(snoozeEnd), 'PPp')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {n.link && (
                        <Button variant="default" size="sm" className="rounded-lg" asChild>
                          <Link to={n.link}>View</Link>
                        </Button>
                      )}
                      {isAlarmType && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => {
                              snoozeAlarm(n.id, 5)
                            }}
                          >
                            Snooze 5m
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => {
                              snoozeAlarm(n.id, 15)
                            }}
                          >
                            Snooze 15m
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => {
                              dismissAlarm(n.id)
                              markRead(n.id)
                            }}
                          >
                            Dismiss
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
