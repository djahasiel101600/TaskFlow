import { useEffect, useState } from 'react'
import { usersApi, type UserFull } from '@/shared/api/users'
import { useAuthStore } from '@/shared/store/auth'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Plus, Pencil } from 'lucide-react'
import { EditUserDialog } from '@/features/user/edit-user'
import { CreateUserDialog } from '@/features/user/create-user'

export function UsersPage() {
  const user = useAuthStore((s) => s.user)
  const isSuperuser = user?.is_superuser ?? false
  const [users, setUsers] = useState<UserFull[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<UserFull | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = () => {
    setLoading(true)
    usersApi
      .listFull()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">User management</h1>
          <p className="text-muted-foreground mt-1">Manage users and assign roles</p>
        </div>
        {isSuperuser && (
          <>
            <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={load} />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add user
            </Button>
          </>
        )}
      </div>

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
                    <th className="text-left p-3 font-medium w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No users found.
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
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditUser(u)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
