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
import { Button } from '@/components/custom/Button/Button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/custom/Input/Input'
import { Checkbox } from '@/components/ui/checkbox'
import { IconPlus, IconTarget } from '@tabler/icons-react'
import type { CombinedActivityGoal, ActivityGoal } from '@/types/strava'
import type { ActivityConfig } from '@/config/activities'
import { ACTIVITY_CONFIGS } from '@/config/activities'
import { getStoredGoals, saveGoals } from '@/lib/goals/storage'

interface CombinedActivityGoalDialogProps {
  // For combined activities
  existingGoal?: CombinedActivityGoal
  // For single activities
  activityConfig?: ActivityConfig
  currentGoal?: ActivityGoal
  // Common
  onSave?: () => void
  trigger?: React.ReactNode
}

export function CombinedActivityGoalDialog({
  existingGoal,
  activityConfig,
  currentGoal,
  onSave,
  trigger
}: CombinedActivityGoalDialogProps) {
  const [open, setOpen] = React.useState(false)

  // Determine if this is single or combined mode
  const isSingleMode = !!activityConfig
  const isCombinedMode = !isSingleMode

  // State for combined mode
  const [name, setName] = React.useState(existingGoal?.name || '')
  const [selectedActivities, setSelectedActivities] = React.useState<string[]>(
    existingGoal?.activityIds || (activityConfig ? [activityConfig.id] : [])
  )

  // State for goal values
  const initialGoal = isSingleMode ? currentGoal : existingGoal?.goal
  const [distance, setDistance] = React.useState<string>(
    initialGoal?.distance ? (initialGoal.distance / 1000).toString() : ''
  )
  const [count, setCount] = React.useState<string>(
    initialGoal?.count?.toString() || ''
  )
  const [elevation, setElevation] = React.useState<string>(
    initialGoal?.elevation?.toString() || ''
  )
  const [time, setTime] = React.useState<string>(
    initialGoal?.time ? (initialGoal.time / 3600).toString() : ''
  )

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      const goal = isSingleMode ? currentGoal : existingGoal?.goal
      setDistance(goal?.distance ? (goal.distance / 1000).toString() : '')
      setCount(goal?.count?.toString() || '')
      setElevation(goal?.elevation?.toString() || '')
      setTime(goal?.time ? (goal.time / 3600).toString() : '')

      if (isSingleMode && activityConfig) {
        setName(activityConfig.displayName)
        setSelectedActivities([activityConfig.id])
      } else if (existingGoal) {
        setName(existingGoal.name)
        setSelectedActivities(existingGoal.activityIds)
      }
    }
  }, [open, isSingleMode, activityConfig, currentGoal, existingGoal])

  const handleSave = () => {
    const goals = getStoredGoals()

    const goalData: ActivityGoal = {
      distance: distance ? parseFloat(distance) * 1000 : undefined,
      count: count ? parseInt(count) : undefined,
      elevation: elevation ? parseFloat(elevation) : undefined,
      time: time ? parseFloat(time) * 3600 : undefined,
    }

    if (isSingleMode && activityConfig) {
      // Save as individual activity goal
      saveGoals({
        ...goals,
        activities: {
          ...goals.activities,
          [activityConfig.id]: goalData,
        },
      })
    } else {
      // Save as combined activity goal
      if (!name || selectedActivities.length === 0) return

      const goalId = existingGoal?.id || `combined-${Date.now()}`
      const combinedGoal: CombinedActivityGoal = {
        id: goalId,
        name,
        activityIds: selectedActivities,
        goal: goalData,
        visible: true,
      }

      saveGoals({
        ...goals,
        combined: {
          ...goals.combined,
          [goalId]: combinedGoal,
        },
      })
    }

    setOpen(false)
    onSave?.()
  }

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev =>
      prev.includes(activityId)
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    )
  }

  // Determine which metrics to show based on selected activities
  const availableMetrics = React.useMemo(() => {
    if (isSingleMode && activityConfig) {
      return activityConfig.metrics
    }

    // For combined mode, show all metrics that any selected activity supports
    const metrics = { distance: false, count: false, elevation: false, time: false }
    selectedActivities.forEach(activityId => {
      const config = ACTIVITY_CONFIGS[activityId]
      if (config) {
        if (config.metrics.distance) metrics.distance = true
        if (config.metrics.count) metrics.count = true
        if (config.metrics.elevation) metrics.elevation = true
        if (config.metrics.time) metrics.time = true
      }
    })
    return metrics
  }, [isSingleMode, activityConfig, selectedActivities])

  const hasAnyGoal = distance || count || elevation || time

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            {isSingleMode ? (
              <>
                <IconTarget className="h-4 w-4 mr-2" />
                {hasAnyGoal ? 'Edit Goal' : 'Set Goal'}
              </>
            ) : (
              <>
                <IconPlus className="h-4 w-4 mr-2" />
                {existingGoal ? 'Edit Combined Goal' : 'Add Combined Goal'}
              </>
            )}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSingleMode
              ? `Set Goals for ${activityConfig?.displayName}`
              : existingGoal
                ? 'Edit Combined Activity Goal'
                : 'Create Combined Activity Goal'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSingleMode
              ? `Set your year-to-date targets for ${activityConfig?.displayName.toLowerCase()}`
              : 'Combine multiple activity types and set a shared goal for them'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <FieldGroup className="py-4 space-y-4 max-h-[500px] overflow-y-auto">
          {/* Name field - only for combined mode */}
          {isCombinedMode && (
            <Field>
              <FieldLabel htmlFor="combined-name">Goal Name</FieldLabel>
              <Input
                id="combined-name"
                placeholder="e.g., Cardio, All Running"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          )}

          {/* Activity selection - only for combined mode */}
          {isCombinedMode && (
            <div className="space-y-2">
              <FieldLabel>Select Activities to Combine</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(ACTIVITY_CONFIGS).map(config => (
                  <Checkbox
                    key={config.id}
                    checked={selectedActivities.includes(config.id)}
                    onCheckedChange={() => toggleActivity(config.id)}
                    label={config.displayName}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Goal metrics */}
          <div className="space-y-2">
            <FieldLabel>Goal Metrics</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {availableMetrics.distance && (
                <Field>
                  <FieldLabel htmlFor="goal-distance">Distance (km)</FieldLabel>
                  <Input
                    id="goal-distance"
                    type="number"
                    placeholder="1000"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                  />
                </Field>
              )}

              {availableMetrics.count && (
                <Field>
                  <FieldLabel htmlFor="goal-count">Activities</FieldLabel>
                  <Input
                    id="goal-count"
                    type="number"
                    placeholder="50"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                </Field>
              )}

              {availableMetrics.elevation && (
                <Field>
                  <FieldLabel htmlFor="goal-elevation">Elevation (m)</FieldLabel>
                  <Input
                    id="goal-elevation"
                    type="number"
                    placeholder="10000"
                    value={elevation}
                    onChange={(e) => setElevation(e.target.value)}
                  />
                </Field>
              )}

              {availableMetrics.time && (
                <Field>
                  <FieldLabel htmlFor="goal-time">Time (hours)</FieldLabel>
                  <Input
                    id="goal-time"
                    type="number"
                    placeholder="100"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </Field>
              )}
            </div>
          </div>
        </FieldGroup>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSave}
            disabled={isCombinedMode && (!name || selectedActivities.length === 0)}
          >
            Save Goal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
