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
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/custom/Card'
import { Stack } from '@/components/custom/Stack/Stack'

import './create-dashboard-form.css'

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
      setError(err instanceof Error ? err.message : 'Failed to create dashboard')
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
          <Stack gap="medium">
            <Stack gap="small">
              <Label htmlFor="dashboard-name">Dashboard Name *</Label>
              <Input
                id="dashboard-name"
                placeholder="My Running Dashboard"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </Stack>
            <Stack gap="small">
              <Label htmlFor="dashboard-description">Description (optional)</Label>
              <Textarea
                id="dashboard-description"
                placeholder="Track weekly running stats and goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </Stack>

            {/* Options */}
            <Stack gap="small" style={{ paddingTop: '0.5rem' }}>
              <label className="CreateDashboardForm__Checkbox">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <span>Set as my default dashboard</span>
              </label>
              <label className="CreateDashboardForm__Checkbox">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span>Make this dashboard public (anyone with the link can view)</span>
              </label>
            </Stack>

            {error && <p className="CreateDashboardForm__Error">{error}</p>}
          </Stack>
        </CardContent>
        <CardFooter>
          <Button type="button" variant="secondary" onClick={() => navigate({ to: '/dashboards' })}>
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
