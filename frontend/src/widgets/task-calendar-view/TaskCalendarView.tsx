import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfDay,
} from 'date-fns'
import type { Task } from '@/entities/task/model/types'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface TaskCalendarViewProps {
  tasks: Task[]
  onUpdate: () => void
}

export function TaskCalendarView({ tasks }: TaskCalendarViewProps) {
  const now = new Date()
  const [viewDate, setViewDate] = useState(() => startOfDay(now))

  const start = startOfMonth(viewDate)
  const end = endOfMonth(viewDate)
  const days = eachDayOfInterval({ start, end })

  const tasksByDay = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.deadline) return acc
    const key = format(new Date(t.deadline), 'yyyy-MM-dd')
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const goPrev = () => setViewDate((d) => subMonths(d, 1))
  const goNext = () => setViewDate((d) => addMonths(d, 1))
  const goToday = () => setViewDate(startOfDay(now))

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <h3 className="font-semibold">{format(viewDate, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={goPrev}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-w-[4rem]"
            onClick={goToday}
            aria-label="Current month"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={goNext}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {WEEKDAY_LABELS.map((d) => (
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
          const isToday = isSameDay(day, now)
          return (
            <div key={key} className="min-h-[80px] p-2 bg-background">
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
                      title={t.title}
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
