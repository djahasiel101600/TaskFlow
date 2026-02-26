import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import type { Task } from '@/entities/task/model/types'
import { Card } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

interface TaskCalendarViewProps {
  tasks: Task[]
  onUpdate: () => void
}

export function TaskCalendarView({ tasks }: TaskCalendarViewProps) {
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)
  const days = eachDayOfInterval({ start, end })
  const tasksByDay = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.deadline) return acc
    const key = format(new Date(t.deadline), 'yyyy-MM-dd')
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">{format(now, 'MMMM yyyy')}</h3>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-muted/50 p-2 text-center text-xs font-medium">
            {d}
          </div>
        ))}
        {Array.from({ length: start.getDay() }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-muted/30 min-h-[80px]" />
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDay[key] ?? []
          const isCurrentMonth = isSameMonth(day, now)
          const isToday = isSameDay(day, now)
          return (
            <div
              key={key}
              className={cn(
                'min-h-[80px] p-2 bg-background',
                !isCurrentMonth && 'opacity-50'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                  isToday && 'bg-primary text-primary-foreground'
                )}
              >
                {format(day, 'd')}
              </span>
              <ul className="mt-1 space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/tasks/${t.id}`}
                      className="block truncate rounded px-1 py-0.5 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
                {dayTasks.length > 3 && (
                  <li className="text-xs text-muted-foreground px-1">
                    +{dayTasks.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
