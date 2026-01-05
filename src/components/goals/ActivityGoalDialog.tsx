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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { IconTarget } from '@tabler/icons-react'
import type { ActivityGoal } from '@/types/strava'
import type { ActivityConfig } from '@/config/activities'
import { saveGoals, getStoredGoals } from '@/lib/goals/storage'

interface ActivityGoalDialogProps {
  activityConfig: ActivityConfig
  currentGoal?: ActivityGoal
  onGoalUpdate?: () => void
}

export function ActivityGoalDialog({
  activityConfig,
  currentGoal,
  onGoalUpdate
}: ActivityGoalDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [goal, setGoal] = React.useState<ActivityGoal>(currentGoal || {})

  // Reset goal when dialog opens
  React.useEffect(() => {
    if (open) {
      setGoal(currentGoal || {})
    }
  }, [open, currentGoal])

  const handleSave = () => {
    const allGoals = getStoredGoals()

    // Update the goal for this specific activity
    const updatedGoals = {
      ...allGoals,
      activities: {
        ...allGoals.activities,
        [activityConfig.id]: goal,
      },
    }

    saveGoals(updatedGoals)
    setOpen(false)

    // Notify parent component to refresh
    if (onGoalUpdate) {
      onGoalUpdate()
    } else {
      // Fallback to page reload if no callback provided
      window.location.reload()
    }
  }

  const hasAnyGoal = Object.values(goal).some(value => value !== undefined && value > 0)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        <IconTarget data-icon="inline-start" size={16} />
        {hasAnyGoal ? 'Edit Goals' : 'Set Goals'}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set Goals for {activityConfig.displayName}</AlertDialogTitle>
          <AlertDialogDescription>
            Set your year-to-date targets for {activityConfig.displayName.toLowerCase()}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <FieldGroup className="py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Distance field */}
            {activityConfig.metrics.distance && (
              <Field>
                <FieldLabel htmlFor="goal-distance">Distance (km)</FieldLabel>
                <Input
                  id="goal-distance"
                  type="number"
                  placeholder="1000"
                  value={goal.distance ? goal.distance / 1000 : ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setGoal({
                      ...goal,
                      distance: isNaN(value) || value === 0 ? undefined : value * 1000,
                    })
                  }}
                />
              </Field>
            )}

            {/* Count field */}
            {activityConfig.metrics.count && (
              <Field>
                <FieldLabel htmlFor="goal-count">Activities</FieldLabel>
                <Input
                  id="goal-count"
                  type="number"
                  placeholder="50"
                  value={goal.count ?? ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    setGoal({
                      ...goal,
                      count: isNaN(value) || value === 0 ? undefined : value,
                    })
                  }}
                />
              </Field>
            )}

            {/* Elevation field */}
            {activityConfig.metrics.elevation && (
              <Field>
                <FieldLabel htmlFor="goal-elevation">Elevation (m)</FieldLabel>
                <Input
                  id="goal-elevation"
                  type="number"
                  placeholder="10000"
                  value={goal.elevation ?? ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setGoal({
                      ...goal,
                      elevation: isNaN(value) || value === 0 ? undefined : value,
                    })
                  }}
                />
              </Field>
            )}

            {/* Time field */}
            {activityConfig.metrics.time && (
              <Field>
                <FieldLabel htmlFor="goal-time">Time (hours)</FieldLabel>
                <Input
                  id="goal-time"
                  type="number"
                  placeholder="100"
                  value={goal.time ? goal.time / 3600 : ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setGoal({
                      ...goal,
                      time: isNaN(value) || value === 0 ? undefined : value * 3600,
                    })
                  }}
                />
              </Field>
            )}
          </div>
        </FieldGroup>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Save Goals</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
