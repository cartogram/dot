import * as React from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/shared/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { IconPlus, IconEdit } from '@tabler/icons-react'
import type { ActivityCardConfig, TimeFrame, DisplayMode } from '@/types/dashboard'
import { ACTIVITY_CONFIGS } from '@/config/activities'
import { supabase } from '@/lib/supabase/client'
import { addDashboardCard, updateDashboardCard, deleteDashboardCard } from '@/lib/supabase/dashboard'
import { useAuth } from '@/lib/auth/SimpleAuthContext'

interface CardConfigDialogProps {
  existingCard?: ActivityCardConfig
  onSave?: () => void
  trigger?: React.ReactNode
}

export function CardConfigDialog({ existingCard, onSave, trigger }: CardConfigDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const isEditMode = !!existingCard

  // Form state
  const [title, setTitle] = React.useState(existingCard?.title || '')
  const [timeFrame, setTimeFrame] = React.useState<TimeFrame>(existingCard?.timeFrame || 'week')
  const [selectedActivities, setSelectedActivities] = React.useState<string[]>(
    existingCard?.activityIds || []
  )
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>(existingCard?.displayMode || 'card')

  // Metric checkboxes state
  const [showDistance, setShowDistance] = React.useState(existingCard?.showMetrics.distance ?? false)
  const [showCount, setShowCount] = React.useState(existingCard?.showMetrics.count ?? false)
  const [showElevation, setShowElevation] = React.useState(existingCard?.showMetrics.elevation ?? false)
  const [showTime, setShowTime] = React.useState(existingCard?.showMetrics.time ?? false)

  // Goal values
  const [distance, setDistance] = React.useState<string>(
    existingCard?.goal?.distance ? (existingCard.goal.distance / 1000).toString() : ''
  )
  const [count, setCount] = React.useState<string>(
    existingCard?.goal?.count?.toString() || ''
  )
  const [elevation, setElevation] = React.useState<string>(
    existingCard?.goal?.elevation?.toString() || ''
  )
  const [time, setTime] = React.useState<string>(
    existingCard?.goal?.time ? (existingCard.goal.time / 3600).toString() : ''
  )

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open && existingCard) {
      setTitle(existingCard.title)
      setTimeFrame(existingCard.timeFrame)
      setSelectedActivities(existingCard.activityIds)
      setDisplayMode(existingCard.displayMode)
      setShowDistance(existingCard.showMetrics.distance)
      setShowCount(existingCard.showMetrics.count)
      setShowElevation(existingCard.showMetrics.elevation)
      setShowTime(existingCard.showMetrics.time)
      setDistance(existingCard.goal?.distance ? (existingCard.goal.distance / 1000).toString() : '')
      setCount(existingCard.goal?.count?.toString() || '')
      setElevation(existingCard.goal?.elevation?.toString() || '')
      setTime(existingCard.goal?.time ? (existingCard.goal.time / 3600).toString() : '')
    } else if (open && !existingCard) {
      // Reset for new card
      setTitle('')
      setTimeFrame('week')
      setSelectedActivities([])
      setDisplayMode('card')
      setShowDistance(false)
      setShowCount(false)
      setShowElevation(false)
      setShowTime(false)
      setDistance('')
      setCount('')
      setElevation('')
      setTime('')
    }
  }, [open, existingCard])

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev =>
      prev.includes(activityId)
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    )
  }

  // Determine which metrics are available based on selected activities
  const availableMetrics = React.useMemo(() => {
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
  }, [selectedActivities])

  const handleSave = async () => {
    if (!title || selectedActivities.length === 0 || !user) return

    setIsSaving(true)
    try {
      const cardData = {
        type: 'activity' as const,
        title,
        size: 'medium' as const,
        visible: true,
        timeFrame,
        activityIds: selectedActivities,
        metrics: availableMetrics,
        showMetrics: {
          distance: showDistance && availableMetrics.distance,
          count: showCount && availableMetrics.count,
          elevation: showElevation && availableMetrics.elevation,
          time: showTime && availableMetrics.time,
        },
        goal: {
          distance: showDistance && distance ? parseFloat(distance) * 1000 : undefined,
          count: showCount && count ? parseInt(count) : undefined,
          elevation: showElevation && elevation ? parseFloat(elevation) : undefined,
          time: showTime && time ? parseFloat(time) * 3600 : undefined,
        },
        displayMode,
      }

      if (isEditMode) {
        await updateDashboardCard(supabase, user.id, existingCard.id, cardData)
      } else {
        await addDashboardCard(supabase, user.id, cardData)
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
    if (!existingCard || !user) return
    if (!window.confirm('Are you sure you want to delete this card?')) return

    setIsSaving(true)
    try {
      await deleteDashboardCard(supabase, user.id, existingCard.id)
      setOpen(false)
      onSave?.()
    } catch (error) {
      console.error('Error deleting card:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger>
        {trigger || (
          <>
            {isEditMode ? (
              <>
                <IconEdit className="h-4 w-4 mr-2" />
                Edit Card
              </>
            ) : (
              <>
                <IconPlus className="h-4 w-4 mr-2" />
                Add Card
              </>
            )}
          </>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isEditMode ? 'Edit Activity Card' : 'Add Activity Card'}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <FieldGroup className="py-4 space-y-4 max-h-[600px] overflow-y-auto">
          {/* General Settings */}
          <div className="space-y-3">
            <Field>
              <FieldLabel htmlFor="card-title">Title</FieldLabel>
              <Input
                id="card-title"
                placeholder="e.g., Weekly Running, Monthly Cardio"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="time-frame">Time Frame</FieldLabel>
              <select
                id="time-frame"
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                className="border-input bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 rounded-4xl border px-3 py-2 text-sm transition-colors focus-visible:ring-[3px] h-9 w-full outline-none"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="all">All Time</option>
              </select>
            </Field>
          </div>

          {/* Activity Selection */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Select Activities</h3>
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

          {/* Metrics & Goals */}
          {selectedActivities.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Metrics & Goals</h3>
              <div className="space-y-3">
                {availableMetrics.distance && (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={showDistance}
                      onCheckedChange={(checked) => setShowDistance(!!checked)}
                      label="Distance"
                      className="mt-2"
                    />
                    {showDistance && (
                      <Field className="flex-1">
                        <FieldLabel htmlFor="goal-distance">Goal (km)</FieldLabel>
                        <Input
                          id="goal-distance"
                          type="number"
                          placeholder="e.g., 50"
                          value={distance}
                          onChange={(e) => setDistance(e.target.value)}
                        />
                      </Field>
                    )}
                  </div>
                )}

                {availableMetrics.count && (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={showCount}
                      onCheckedChange={(checked) => setShowCount(!!checked)}
                      label="Count"
                      className="mt-2"
                    />
                    {showCount && (
                      <Field className="flex-1">
                        <FieldLabel htmlFor="goal-count">Goal (activities)</FieldLabel>
                        <Input
                          id="goal-count"
                          type="number"
                          placeholder="e.g., 10"
                          value={count}
                          onChange={(e) => setCount(e.target.value)}
                        />
                      </Field>
                    )}
                  </div>
                )}

                {availableMetrics.elevation && (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={showElevation}
                      onCheckedChange={(checked) => setShowElevation(!!checked)}
                      label="Elevation"
                      className="mt-2"
                    />
                    {showElevation && (
                      <Field className="flex-1">
                        <FieldLabel htmlFor="goal-elevation">Goal (m)</FieldLabel>
                        <Input
                          id="goal-elevation"
                          type="number"
                          placeholder="e.g., 1000"
                          value={elevation}
                          onChange={(e) => setElevation(e.target.value)}
                        />
                      </Field>
                    )}
                  </div>
                )}

                {availableMetrics.time && (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={showTime}
                      onCheckedChange={(checked) => setShowTime(!!checked)}
                      label="Time"
                      className="mt-2"
                    />
                    {showTime && (
                      <Field className="flex-1">
                        <FieldLabel htmlFor="goal-time">Goal (hours)</FieldLabel>
                        <Input
                          id="goal-time"
                          type="number"
                          placeholder="e.g., 10"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </Field>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </FieldGroup>

        <AlertDialogFooter className="flex flex-0 gap-8 justify-between">
        {isEditMode && (<div>
            
              <Button variant="destructive" onClick={handleDelete}>
                Delete Card
              </Button>
            </div>
          )}
          <div className="flex flex-1 gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!title || selectedActivities.length === 0 || isSaving}>
              {isSaving ? 'Saving...' : isEditMode ? 'Save' : 'Add Card'}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
