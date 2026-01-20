/**
 * CreateGroupForm Component
 *
 * Form to create a new group.
 */

import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createGroup } from '@/lib/server/groups'
import { Input } from '@/components/custom/Input/Input'
import { Textarea } from '@/components/custom/Textarea/Textarea'
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

interface CreateGroupFormProps {
  userId: string
}

export function CreateGroupForm({ userId }: CreateGroupFormProps) {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () =>
      createGroup({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          userId,
        },
      }),
    onSuccess: (group) => {
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      // Navigate to the new group
      navigate({ to: `/group/${group.id}` })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (name.trim()) {
      createMutation.mutate()
    }
  }

  return (
    <Card state="active">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Create a New Group</CardTitle>
          <CardDescription>
            Create a group to share activity dashboards with friends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                placeholder="My Running Club"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description (optional)</Label>
              <Textarea
                id="group-description"
                placeholder="A group for tracking our weekly runs together..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate({ to: '/groups' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Group'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
