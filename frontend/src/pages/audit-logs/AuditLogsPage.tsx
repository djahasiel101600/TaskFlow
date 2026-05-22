import { useEffect, useState, useCallback } from 'react'
import { auditLogsApi, type AuditLog, type AuditLogListParams } from '@/shared/api/audit-logs'
import { Card, CardContent } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { format, formatDistanceToNow } from 'date-fns'
import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw } from 'lucide-react'

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Logged in',
  logout: 'Logged out',
}

const ACTION_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
}

const PAGE_SIZE = 25

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const params: AuditLogListParams = { page: p, page_size: PAGE_SIZE }
      if (actionFilter !== 'all') params.action = actionFilter
      if (modelFilter !== 'all') params.model_name = modelFilter
      const res = await auditLogsApi.list(params)
      setLogs(res.results)
      setTotalCount(res.count)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, modelFilter])

  useEffect(() => {
    setPage(1)
  }, [actionFilter, modelFilter])

  useEffect(() => {
    load(page)
  }, [page, actionFilter, modelFilter])

  const modelNames = Array.from(new Set(logs.map((l) => l.model_name))).sort()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary shrink-0" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            System activity and change history
            {totalCount > 0 && ` · ${totalCount.toLocaleString()} entries`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading} className="gap-1.5 self-start sm:self-auto">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36 h-9 rounded-lg text-sm">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="create">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-40 h-9 rounded-lg text-sm">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            {modelNames.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading audit logs…</p>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Model</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Object</th>
                    <th className="text-left p-3 font-medium text-muted-foreground w-[80px]">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-muted-foreground">
                        No audit logs found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <>
                        <tr
                          key={log.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        >
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-medium text-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </span>
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium">{log.username ?? '—'}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant={ACTION_VARIANT[log.action] ?? 'outline'} className="capitalize text-xs">
                              {ACTION_LABELS[log.action] ?? log.action}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground capitalize">{log.model_name}</td>
                          <td className="p-3 text-muted-foreground font-mono text-xs">#{log.object_id}</td>
                          <td className="p-3">
                            {Object.keys(log.changes ?? {}).length > 0 && (
                              <span className="text-xs text-primary underline underline-offset-2">
                                {expandedId === log.id ? 'Hide' : 'View'}
                              </span>
                            )}
                          </td>
                        </tr>
                        {expandedId === log.id && Object.keys(log.changes ?? {}).length > 0 && (
                          <tr key={`${log.id}-changes`} className="bg-muted/20">
                            <td colSpan={6} className="px-6 py-3">
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {totalCount.toLocaleString()} entries
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
