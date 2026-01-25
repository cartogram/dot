import * as React from 'react'
import { SidePanel } from '@/components/custom/SidePanel'
import { Button } from '@/components/custom/Button/Button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/custom/Input/Input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardTitle,
  CardContent,
  CardHeader,
} from '@/components/custom/Card/Card'
import type {
  ActivityType,
  Metric,
  TimeFrame,
  DashboardCard,
} from '@/types/dashboard'
import {
  TIME_FRAMES,
  METRIC_LABELS,
  METRIC_UNITS,
  TIME_FRAME_LABELS,
} from '@/types/dashboard'
import { ACTIVITY_CONFIGS } from '@/config/activities'
import {
  addDashboardCard,
  updateDashboardCard,
  deleteDashboardCard,
} from '@/lib/server/dashboardConfig'

interface CardConfigDialogProps {
  dashboardId: string
  existingCard?: DashboardCard
  onSave?: () => void
  trigger?: React.ReactNode
}

export function CardConfigDialog({
  dashboardId,
  existingCard,
  onSave,
  trigger,
}: CardConfigDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const isEditMode = !!existingCard

  // Form state
  const [title, setTitle] = React.useState(existingCard?.title || '')
  const [timeFrame, setTimeFrame] = React.useState<TimeFrame>(
    (existingCard?.timeFrame as TimeFrame) || 'week',
  )
  const [selectedActivities, setSelectedActivities] = React.useState<ActivityType[]>(
    (existingCard?.activityTypes as ActivityType[]) || [],
  )
  const [metric, setMetric] = React.useState<Metric>(
    (existingCard?.metric as Metric) || 'distance',
  )
  const [goal, setGoal] = React.useState<string>(
    existingCard?.goal ? formatGoalForDisplay(existingCard.goal, existingCard.metric as Metric) : '',
  )

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open && existingCard) {
      setTitle(existingCard.title)
      setTimeFrame(existingCard.timeFrame as TimeFrame)
      setSelectedActivities(existingCard.activityTypes as ActivityType[])
      setMetric(existingCard.metric as Metric)
      setGoal(
        existingCard.goal
          ? formatGoalForDisplay(existingCard.goal, existingCard.metric as Metric)
          : '',
      )
    } else if (open && !existingCard) {
      // Reset for new card
      setTitle('')
      setTimeFrame('week')
      setSelectedActivities([])
      setMetric('distance')
      setGoal('')
    }
  }, [open, existingCard])

  const toggleActivity = (activityType: ActivityType) => {
    setSelectedActivities((prev) =>
      prev.includes(activityType)
        ? prev.filter((t) => t !== activityType)
        : [...prev, activityType],
    )
  }

  // Determine which metrics are available based on selected activities
  const availableMetrics = React.useMemo(() => {
    const metrics = new Set<Metric>()
    selectedActivities.forEach((activityType) => {
      // Find the config for this activity type
      const config = Object.values(ACTIVITY_CONFIGS).find(
        (c) => c.activityType === activityType,
      )
      if (config) {
        if (config.metrics.distance) metrics.add('distance')
        if (config.metrics.count) metrics.add('count')
        if (config.metrics.elevation) metrics.add('elevation')
        if (config.metrics.time) metrics.add('time')
      }
    })
    return metrics
  }, [selectedActivities])

  // Reset metric if it's no longer available
  React.useEffect(() => {
    if (selectedActivities.length > 0 && !availableMetrics.has(metric)) {
      // Pick the first available metric
      const firstAvailable = Array.from(availableMetrics)[0]
      if (firstAvailable) {
        setMetric(firstAvailable)
      }
    }
  }, [availableMetrics, metric, selectedActivities.length])

  const handleSave = async () => {
    if (!title || selectedActivities.length === 0) return

    setIsSaving(true)
    try {
      const goalValue = goal ? parseGoalForStorage(parseFloat(goal), metric) : null

      if (isEditMode) {
        await updateDashboardCard({
          data: {
            cardId: existingCard.id,
            updates: {
              title,
              activityTypes: selectedActivities,
              metric,
              timeFrame,
              goal: goalValue,
            },
          },
        })
      } else {
        await addDashboardCard({
          data: {
            dashboardId,
            card: {
              type: 'activity',
              title,
              activityTypes: selectedActivities,
              metric,
              timeFrame,
              goal: goalValue,
            },
          },
        })
      }

      setOpen(false)
      onSave?.()
    } catch (error) {
      console.error('Error saving card:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingCard) return
    if (!window.confirm('Are you sure you want to delete this card?')) return

    setIsSaving(true)
    try {
      await deleteDashboardCard({ data: { cardId: existingCard.id } })
      setOpen(false)
      onSave?.()
    } catch (error) {
      console.error('Error deleting card:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <>
      <Button
        size={isEditMode ? 'small' : 'default'}
        variant={isEditMode ? 'secondary' : 'primary'}
        onClick={() => setOpen(true)}
      >
        {trigger || <>{isEditMode ? <>Edit Card</> : <>Add Card</>}</>}
      </Button>
      <SidePanel
        open={open}
        onOpenChange={setOpen}
        title={isEditMode ? 'Edit Activity' : 'Add Activity'}
        className="data-[side=right]:w-full data-[side=right]:max-w-full data-[side=right]:md:max-w-1/2"
        footer={
          <div className="flex flex-1 gap-2 justify-between w-full">
            {isEditMode && (
              <Button
                variant="secondary"
                destructive
                onClick={handleDelete}
              >
                Delete Card
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!title || selectedActivities.length === 0 || isSaving}
              >
                {isSaving ? 'Saving...' : isEditMode ? 'Save' : 'Add Card'}
              </Button>
            </div>
          </div>
        }
      >
        <FieldGroup>
          {/* General Settings */}
          <Card state="active">
            <Field>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldLabel htmlFor="card-title">Title</FieldLabel>
                <Input
                  id="card-title"
                  placeholder="e.g., Weekly Running, Monthly Cardio"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <FieldLabel htmlFor="time-frame">Time Frame</FieldLabel>
                <select
                  id="time-frame"
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                  className="border-input bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 rounded-4xl border px-3 py-2 text-sm transition-colors focus-visible:ring-[3px] h-9 w-full outline-none"
                >
                  {TIME_FRAMES.map((value) => (
                    <option key={value} value={value}>
                      {TIME_FRAME_LABELS[value]}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Field>
          </Card>

          {/* Activity Selection */}
          <Card>
            <CardHeader />
            <CardContent>
              <FieldLabel htmlFor="activities">Select Activities</FieldLabel>
              <Field>
                {Object.values(ACTIVITY_CONFIGS).map((config) => (
                  <Checkbox
                    key={config.id}
                    checked={selectedActivities.includes(config.activityType)}
                    onCheckedChange={() => toggleActivity(config.activityType)}
                    label={config.displayName}
                  />
                ))}
              </Field>
            </CardContent>
          </Card>

          {/* Metric & Goal */}
          {selectedActivities.length > 0 && (
            <Card>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Metric to Track</FieldLabel>
                    <div className="space-y-2 mt-2">
                      {Array.from(availableMetrics).map((m) => (
                        <label
                          key={m}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="metric"
                            value={m}
                            checked={metric === m}
                            onChange={() => setMetric(m)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{METRIC_LABELS[m]}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="goal">
                      Goal ({METRIC_UNITS[metric]})
                    </FieldLabel>
                    <Input
                      id="goal"
                      type="number"
                      placeholder={`e.g., ${getGoalPlaceholder(metric)}`}
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}
        </FieldGroup>
      </SidePanel>
    </>
  )
}

// Helper functions for goal conversion
function formatGoalForDisplay(goal: number, metric: Metric): string {
  switch (metric) {
    case 'distance':
      return (goal / 1000).toString() // meters to km
    case 'time':
      return (goal / 3600).toString() // seconds to hours
    default:
      return goal.toString()
  }
}

function parseGoalForStorage(displayValue: number, metric: Metric): number {
  switch (metric) {
    case 'distance':
      return displayValue * 1000 // km to meters
    case 'time':
      return displayValue * 3600 // hours to seconds
    default:
      return displayValue
  }
}

function getGoalPlaceholder(metric: Metric): string {
  switch (metric) {
    case 'distance':
      return '50'
    case 'count':
      return '10'
    case 'elevation':
      return '1000'
    case 'time':
      return '10'
    default:
      return '10'
  }
}
