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
import { Checkbox } from '@/components/ui/checkbox'
import { IconTarget } from '@tabler/icons-react'
import type { YearlyGoals, ActivityGoal } from '@/types/strava'
import { saveGoals, getStoredGoals } from '@/lib/goals/storage'
import { ACTIVITY_CONFIGS } from '@/config/activities'

export function GoalSettingDialog() {
  const [open, setOpen] = React.useState(false)
  const [goals, setGoals] = React.useState<YearlyGoals>(() => {
    const stored = getStoredGoals()
    return {
      activities: stored.activities || {},
      visibility: stored.visibility || {},
    }
  })

  const handleSave = () => {
    saveGoals(goals)
    setOpen(false)
    // Force page reload to refresh stats with new goals
    window.location.reload()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <IconTarget data-icon="inline-start" />
        Set Goals
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set Your Yearly Goals</AlertDialogTitle>
          <AlertDialogDescription>
            Set targets for your year-to-date activities
          </AlertDialogDescription>
        </AlertDialogHeader>

        <FieldGroup className="py-4 space-y-4 max-h-[500px] overflow-y-auto">
          {/* Dynamically generate sections for each activity type */}
          {Object.values(ACTIVITY_CONFIGS).map(config => {
            const activityGoal = goals.activities[config.id] || {}
            const isVisible = goals.visibility[config.id] ?? false

            return (
              <div key={config.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{config.displayName}</div>
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={(checked) =>
                      setGoals({
                        ...goals,
                        visibility: {
                          ...goals.visibility,
                          [config.id]: checked === true,
                        },
                      })
                    }
                    label="Show"
                  />
                </div>

                {/* Only show goal inputs if visible */}
                {isVisible && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Distance field */}
                    {config.metrics.distance && (
                      <Field>
                        <FieldLabel htmlFor={`${config.id}-distance`}>Distance (km)</FieldLabel>
                        <Input
                          id={`${config.id}-distance`}
                          type="number"
                          placeholder="1000"
                          value={activityGoal.distance ? activityGoal.distance / 1000 : ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            setGoals({
                              ...goals,
                              activities: {
                                ...goals.activities,
                                [config.id]: {
                                  ...activityGoal,
                                  distance: isNaN(value) ? undefined : value * 1000,
                                },
                              },
                            })
                          }}
                        />
                      </Field>
                    )}

                    {/* Count field */}
                    {config.metrics.count && (
                      <Field>
                        <FieldLabel htmlFor={`${config.id}-count`}>Activities</FieldLabel>
                        <Input
                          id={`${config.id}-count`}
                          type="number"
                          placeholder="50"
                          value={activityGoal.count ?? ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value)
                            setGoals({
                              ...goals,
                              activities: {
                                ...goals.activities,
                                [config.id]: {
                                  ...activityGoal,
                                  count: isNaN(value) ? undefined : value,
                                },
                              },
                            })
                          }}
                        />
                      </Field>
                    )}

                    {/* Elevation field */}
                    {config.metrics.elevation && (
                      <Field>
                        <FieldLabel htmlFor={`${config.id}-elevation`}>Elevation (m)</FieldLabel>
                        <Input
                          id={`${config.id}-elevation`}
                          type="number"
                          placeholder="10000"
                          value={activityGoal.elevation ?? ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            setGoals({
                              ...goals,
                              activities: {
                                ...goals.activities,
                                [config.id]: {
                                  ...activityGoal,
                                  elevation: isNaN(value) ? undefined : value,
                                },
                              },
                            })
                          }}
                        />
                      </Field>
                    )}

                    {/* Time field */}
                    {config.metrics.time && (
                      <Field>
                        <FieldLabel htmlFor={`${config.id}-time`}>Time (hours)</FieldLabel>
                        <Input
                          id={`${config.id}-time`}
                          type="number"
                          placeholder="100"
                          value={activityGoal.time ? activityGoal.time / 3600 : ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            setGoals({
                              ...goals,
                              activities: {
                                ...goals.activities,
                                [config.id]: {
                                  ...activityGoal,
                                  time: isNaN(value) ? undefined : value * 3600,
                                },
                              },
                            })
                          }}
                        />
                      </Field>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </FieldGroup>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Save Goals</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
