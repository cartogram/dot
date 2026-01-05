import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { IconActivity } from '@tabler/icons-react'
import type { YearlyGoals } from '@/types/strava'
import { saveGoals, getStoredGoals } from '@/lib/goals/storage'
import { ACTIVITY_CONFIGS } from '@/config/activities'

export function ActivitiesVisibilityDialog() {
  const [open, setOpen] = React.useState(false)
  const [visibility, setVisibility] = React.useState<Record<string, boolean>>({})

  // Load visibility settings when dialog opens
  React.useEffect(() => {
    if (open) {
      const goals = getStoredGoals()
      setVisibility(goals.visibility || {})
    }
  }, [open])

  const handleSave = () => {
    const goals = getStoredGoals()

    // Update visibility settings
    const updatedGoals: YearlyGoals = {
      ...goals,
      visibility,
    }

    saveGoals(updatedGoals)
    setOpen(false)

    // Reload page to show/hide activities
    window.location.reload()
  }

  const visibleCount = Object.values(visibility).filter(Boolean).length

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <IconActivity data-icon="inline-start" />
        Activities
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Manage Activities</AlertDialogTitle>
          <AlertDialogDescription>
            Choose which activities to display on your dashboard
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {Object.values(ACTIVITY_CONFIGS).map(config => {
            const isVisible = visibility[config.id] ?? false

            return (
              <div
                key={config.id}
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50 transition-colors"
              >
                <div>
                  <div className="font-medium">{config.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    Track your {config.displayName.toLowerCase()} activities
                  </div>
                </div>
                <Checkbox
                  checked={isVisible}
                  onCheckedChange={(checked) =>
                    setVisibility({
                      ...visibility,
                      [config.id]: checked === true,
                    })
                  }
                  label=""
                />
              </div>
            )
          })}
        </div>

        <AlertDialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {visibleCount} {visibleCount === 1 ? 'activity' : 'activities'} selected
            </div>
            <div className="flex gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
            </div>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
