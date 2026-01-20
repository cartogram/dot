/**
 * JoinGroupForm Component
 *
 * Form to join a group using an invite code.
 */

import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { joinGroup } from '@/lib/server/groups'
import { Input } from '@/components/custom/Input/Input'
import { Button } from '@/components/custom/Button/Button'
import { Label } from '@/components/custom/Label/Label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/custom/Card'

interface JoinGroupFormProps {
  userId: string
}

export function JoinGroupForm({ userId }: JoinGroupFormProps) {
  const [inviteCode, setInviteCode] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const joinMutation = useMutation({
    mutationFn: (code: string) =>
      joinGroup({ data: { inviteCode: code, userId } }),
    onSuccess: (group) => {
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      // Navigate to the new group
      navigate({ to: `/group/${group.id}` })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to join group')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (inviteCode.trim()) {
      joinMutation.mutate(inviteCode.trim())
    }
  }

  return (
    <Card state="active">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Join a Group</CardTitle>
          <CardDescription>
            Enter an invite code to join an existing group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="ABCD1234"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={8}
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            variant="secondary"
            disabled={!inviteCode.trim() || joinMutation.isPending}
          >
            {joinMutation.isPending ? 'Joining...' : 'Join Group'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
