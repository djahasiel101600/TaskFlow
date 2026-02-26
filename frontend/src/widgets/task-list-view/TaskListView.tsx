import { Link } from 'react-router-dom'
import type { Task } from '@/entities/task/model/types'
import { Card, CardContent } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { format } from 'date-fns'
import { AlertCircle, Calendar, User } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
}
const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  ongoing: 'bg-primary/15 text-primary',
  finished: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

interface TaskListViewProps {
  tasks: Task[]
  onUpdate: () => void
}

export function TaskListView({ tasks }: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 py-16 text-center">
        <p className="text-muted-foreground">No tasks match your filters.</p>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting search or filters</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link to={`/tasks/${t.id}`}>
            <Card
              className={cn(
                'transition-default hover:shadow-md hover:border-primary/20',
                t.is_overdue && 'border-destructive/40'
              )}
            >
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{t.title}</span>
                    <Badge className={cn('shrink-0', statusColors[t.status] ?? '')}>
                      {t.status}
                    </Badge>
                    <Badge variant="outline" className={cn('shrink-0', priorityColors[t.priority] ?? '')}>
                      {t.priority}
                    </Badge>
                    {t.is_overdue && (
                      <span className="inline-flex items-center gap-1 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" /> Overdue
                      </span>
                    )}
                  </div>
                  {(t.assignees_detail?.length ? t.assignees_detail : t.assigned_to_detail ? [t.assigned_to_detail] : []).length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {(t.assignees_detail ?? []).length > 0
                        ? (t.assignees_detail ?? []).map((u) => u.username).join(', ')
                        : t.assigned_to_detail?.username}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                  {t.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(t.deadline), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
