import { useEffect, useState } from 'react'
import { usersApi, type UserFull } from '@/shared/api/users'
import { useAuthStore } from '@/shared/store/auth'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Plus, Pencil, UserCheck } from 'lucide-react'
import { EditUserDialog } from '@/features/user/edit-user'
import { CreateUserDialog } from '@/features/user/create-user'

type FilterTab = 'all' | 'pending'

export function UsersPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.is_staff ?? user?.is_superuser ?? false
  const [users, setUsers] = useState<UserFull[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [editUser, setEditUser] = useState<UserFull | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    const params = filter === 'pending' ? { is_active: false } : undefined
    usersApi
      .listFull(params)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [filter])

  const handleApprove = async (u: UserFull) => {
    setApprovingId(u.id)
    try {
      await usersApi.update(u.id, { is_active: true })
      load()
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">User management</h1>
          <p className="text-muted-foreground mt-1">Manage users and assign roles</p>
        </div>
        {isAdmin && (
          <>
            <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={load} />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add user
            </Button>
          </>
        )}
      </div>

      {isAdmin && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="w-full max-w-[200px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Loading users…</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {filter === 'pending' ? 'No pending users.' : 'No users found.'}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <span className="font-medium">{u.username}</span>
                          {(u.first_name || u.last_name) && (
                            <span className="text-muted-foreground ml-1">
                              ({[u.first_name, u.last_name].filter(Boolean).join(' ')})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{u.email}</td>
                        <td className="p-3">
                          {u.role_detail ? (
                            <Badge variant="secondary">{u.role_detail.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {u.is_active ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Pending approval</Badge>
                          )}
                        </td>
                        <td className="p-3 flex items-center gap-1">
                          {!u.is_active && isAdmin && (
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleApprove(u)}
                              disabled={approvingId === u.id}
                              title="Approve user"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              {approvingId === u.id ? '…' : 'Approve'}
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditUser(u)}
                              title="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          onSuccess={() => {
            load()
            setEditUser(null)
          }}
        />
      )}
    </div>
  )
}
