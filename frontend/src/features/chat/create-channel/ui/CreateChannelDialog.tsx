import { useState, useEffect } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { chatApi, type ChannelItem } from '@/shared/api/chat'
import { useAuthStore } from '@/shared/store/auth'
import { usersApi } from '@/shared/api/users'
import type { UserMinimal } from '@/shared/api/users'

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (channel: ChannelItem) => void
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateChannelDialogProps) {
  const currentUser = useAuthStore((s) => s.user)
  const [name, setName] = useState('')
  const [channelType, setChannelType] = useState<'direct' | 'group'>('group')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [users, setUsers] = useState<UserMinimal[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setChannelType('group')
      setMemberIds([])
      setError('')
      setUsersLoading(true)
      usersApi
        .list()
        .then(setUsers)
        .catch(() => setUsers([]))
        .finally(() => setUsersLoading(false))
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (channelType === 'direct' && memberIds.length === 0) {
      setError('Select a user for direct message')
      return
    }
    setError('')
    setLoading(true)
    try {
      const members = memberIds.map(Number)
      const channel = await chatApi.createChannel({
        name: name.trim() || (channelType === 'direct' ? users.find((u) => u.id === Number(memberIds[0]))?.username : undefined),
        channel_type: channelType,
        members: members.length ? members : undefined,
      })
      onSuccess(channel)
      onOpenChange(false)
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown } }
      setError(ax.response?.data ? String(ax.response.data) : 'Failed to create channel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={channelType}
              onValueChange={(v) => setChannelType(v as 'direct' | 'group')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct message</SelectItem>
                <SelectItem value="group">Group channel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {channelType === 'group' && (
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel name</Label>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Team Alpha"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Add members</Label>
            {channelType === 'direct' ? (
              <>
                {usersLoading ? (
                  <p className="text-sm text-muted-foreground py-2">Loading users…</p>
                ) : (() => {
                  const otherUsers = users.filter((u) => u.id !== currentUser?.id)
                  if (otherUsers.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-2 border rounded-md bg-muted/50 px-3 py-2">
                        No other users found. To start a direct message, create more users in Django Admin
                        (e.g. <strong>/admin/</strong> → Users → Add user) or log in as another account.
                      </p>
                    )
                  }
                  return (
                    <Select
                      value={memberIds[0] ?? ''}
                      onValueChange={(v) => setMemberIds(v ? [v] : [])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherUsers.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                })()}
              </>
            ) : (
              <div className="border rounded-md p-2 max-h-40 overflow-auto space-y-1">
                {users
                  .filter((u) => u.id !== currentUser?.id)
                  .map((u) => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(String(u.id))}
                        onChange={(e) =>
                          setMemberIds((prev) =>
                            e.target.checked
                              ? [...prev, String(u.id)]
                              : prev.filter((id) => id !== String(u.id))
                          )
                        }
                        className="rounded"
                      />
                      {u.username}
                    </label>
                  ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
