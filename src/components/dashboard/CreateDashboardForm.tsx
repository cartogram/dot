/**
 * CreateDashboardForm Component
 *
 * Form to create a new dashboard.
 */

import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDashboard } from '@/lib/server/dashboards'
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

interface CreateDashboardFormProps {
  userId: string
}

export function CreateDashboardForm({ userId }: CreateDashboardFormProps) {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isPublic, setIsPublic] = React.useState(false)
  const [isDefault, setIsDefault] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () =>
      createDashboard({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          userId,
          isPublic,
          isDefault,
        },
      }),
    onSuccess: (dashboard) => {
      // Invalidate dashboards list
      queryClient.invalidateQueries({ queryKey: ['user-dashboards'] })
      // Navigate to the new dashboard
      navigate({ to: `/dashboards/${dashboard.id}` })
    },
    onError: (err) => {
      setError(
        err instanceof Error ? err.message : 'Failed to create dashboard'
      )
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
          <CardTitle>Create a New Dashboard</CardTitle>

        </CardHeader>
        <CardContent>
          <CardDescription>
            Create a dashboard to track and share activities with others
          </CardDescription>
          <div className="space-y-4 flex flex-col gap-4">
            <div className="space-y-2 flex flex-col gap-2">
              <Label htmlFor="dashboard-name">Dashboard Name *</Label>
              <Input
                id="dashboard-name"
                placeholder="My Running Dashboard"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2 flex flex-col gap-2">
              <Label htmlFor="dashboard-description">
                Description (optional)
              </Label>
              <Textarea
                id="dashboard-description"
                placeholder="Track weekly running stats and goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">Set as my default dashboard</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">
                  Make this dashboard public (anyone with the link can view)
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate({ to: '/dashboards' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Dashboard'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
