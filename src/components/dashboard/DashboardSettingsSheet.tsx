/**
 * DashboardSettingsSheet Component
 *
 * Sheet-based settings panel for dashboard configuration.
 */

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { DashboardData } from '@/types/dashboards'
import { updateDashboard } from '@/lib/server/dashboards'
import { SidePanel } from '@/components/custom/SidePanel'
import { Button } from '@/components/custom/Button/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/custom/Input/Input'

interface DashboardSettingsSheetProps {
  dashboard: DashboardData['dashboard']
  userId: string
  stats?: {
    profileCount: number
    profilesWithData: number
    totalActivities: number
    cardCount: number
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh?: () => void
  onDeleteClick: () => void
}

export function DashboardSettingsSheet({
  dashboard,
  userId,
  stats,
  open,
  onOpenChange,
  onRefresh,
  onDeleteClick,
}: DashboardSettingsSheetProps) {
  const router = useRouter()
  const [editedName, setEditedName] = React.useState(dashboard.name)
  const [editedIsPublic, setEditedIsPublic] = React.useState(dashboard.isPublic)
  const [editedIsDefault, setEditedIsDefault] = React.useState(dashboard.isDefault)

  // Reset form state when dialog opens or dashboard changes
  React.useEffect(() => {
    if (open) {
      setEditedName(dashboard.name)
      setEditedIsPublic(dashboard.isPublic)
      setEditedIsDefault(dashboard.isDefault)
    }
  }, [open, dashboard.name, dashboard.isPublic, dashboard.isDefault])

  const updateSettingsMutation = useMutation({
    mutationFn: (updates: { name?: string; isPublic?: boolean; isDefault?: boolean }) =>
      updateDashboard({
        data: { dashboardId: dashboard.id, userId, ...updates },
      }),
    onSuccess: () => {
      router.invalidate()
      onRefresh?.()
      onOpenChange(false)
    },
  })

  // Check if any settings have changed
  const hasChanges =
    editedName.trim() !== dashboard.name ||
    editedIsPublic !== dashboard.isPublic ||
    editedIsDefault !== dashboard.isDefault

  const handleSaveSettings = () => {
    if (!hasChanges || !editedName.trim()) return

    const updates: { name?: string; isPublic?: boolean; isDefault?: boolean } = {}

    if (editedName.trim() !== dashboard.name) {
      updates.name = editedName.trim()
    }
    if (editedIsPublic !== dashboard.isPublic) {
      updates.isPublic = editedIsPublic
    }
    if (editedIsDefault !== dashboard.isDefault) {
      updates.isDefault = editedIsDefault
    }

    updateSettingsMutation.mutate(updates)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Dashboard Settings"
      description="Configure visibility and default settings for this dashboard."
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={updateSettingsMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveSettings}
            disabled={!hasChanges || !editedName.trim() || updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Dashboard Name */}
        <div className="space-y-2">
          <label htmlFor="dashboard-name" className="text-sm font-medium">
            Dashboard Name
          </label>
          <Input
            id="dashboard-name"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            disabled={updateSettingsMutation.isPending}
          />
        </div>

        {/* Visibility Settings */}
        <div className="space-y-4">
          <Checkbox
            checked={editedIsPublic}
            onCheckedChange={() => setEditedIsPublic(!editedIsPublic)}
            disabled={updateSettingsMutation.isPending}
            label="Make Public"
          />
          <p className="text-sm text-muted-foreground ml-6">
            Public dashboards can be viewed by anyone with the link.
          </p>

          <Checkbox
            checked={editedIsDefault}
            onCheckedChange={() => setEditedIsDefault(!editedIsDefault)}
            disabled={updateSettingsMutation.isPending}
            label="Set as Default"
          />
          <p className="text-sm text-muted-foreground ml-6">
            Your default dashboard is shown on your public profile.
          </p>
        </div>

        {/* Dashboard Summary */}
        {stats && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Dashboard Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-center bg-muted/50 rounded-lg p-3">
              <div>
                <div className="text-xl font-bold">{stats.profileCount}</div>
                <div className="text-xs text-muted-foreground">Profiles</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.profilesWithData}</div>
                <div className="text-xs text-muted-foreground">With Strava</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.totalActivities}</div>
                <div className="text-xs text-muted-foreground">Activities</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.cardCount}</div>
                <div className="text-xs text-muted-foreground">Cards</div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
          <p className="text-sm text-muted-foreground">
            Permanently delete this dashboard and all its cards.
          </p>
          <Button
            variant="secondary"
            destructive
            onClick={() => {
              onOpenChange(false)
              onDeleteClick()
            }}
          >
            Delete Dashboard
          </Button>
        </div>
      </div>
    </SidePanel>
  )
}
