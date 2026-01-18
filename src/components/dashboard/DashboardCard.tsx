import * as React from 'react'
import type { ActivityCardConfig } from '@/types/dashboard'
import type { StravaActivity, StravaStats, ActivityTotals } from '@/types/strava'
import { ACTIVITY_CONFIGS } from '@/config/activities'
import { filterActivitiesByTimeFrame, getTimeFrameDescription } from '@/lib/dashboard/timeframes'
import { calculateActivityProgress } from '@/lib/goals/calculations'
import { ActivityStatsCard } from '@/components/stats/ActivityStatsCard'
import { CardConfigDialog } from './CardConfigDialog'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/custom/Card'

interface DashboardCardProps {
  config: ActivityCardConfig
  allActivities: StravaActivity[] | undefined
  stats: StravaStats | undefined
  isLoading: boolean
  onUpdate: () => void
}

export function DashboardCard({
  config,
  allActivities,
  stats,
  isLoading,
  onUpdate
}: DashboardCardProps) {
  // Filter activities by the card's time frame
  const filteredActivities = React.useMemo(() => {
    return filterActivitiesByTimeFrame(
      allActivities,
      config.timeFrame,
      config.customDateRange
    )
  }, [allActivities, config.timeFrame, config.customDateRange])

  // Aggregate activities based on selected activity types
  const totals = React.useMemo<ActivityTotals | null>(() => {
    if (isLoading || !filteredActivities) return null

    // Get all activity types to combine
    const activityTypes = config.activityIds
      .map(id => ACTIVITY_CONFIGS[id]?.stravaType)
      .filter(Boolean)

    if (activityTypes.length === 0) return null

    // Filter activities that match any of the types
    const relevantActivities = filteredActivities.filter(activity =>
      activityTypes.includes(activity.type)
    )

    // Aggregate them together
    return relevantActivities.reduce((totals, activity) => ({
      count: totals.count + 1,
      distance: totals.distance + activity.distance,
      moving_time: totals.moving_time + activity.moving_time,
      elapsed_time: totals.elapsed_time + activity.elapsed_time,
      elevation_gain: totals.elevation_gain + activity.total_elevation_gain
    }), {
      count: 0,
      distance: 0,
      moving_time: 0,
      elapsed_time: 0,
      elevation_gain: 0
    })
  }, [config.activityIds, filteredActivities, isLoading])

  // Calculate progress based on goals and shown metrics
  const progress = React.useMemo(() => {
    if (!config.goal || !totals) return undefined

    // Only calculate progress for metrics that are shown
    const filteredGoal = {
      distance: config.showMetrics.distance ? config.goal.distance : undefined,
      count: config.showMetrics.count ? config.goal.count : undefined,
      elevation: config.showMetrics.elevation ? config.goal.elevation : undefined,
      time: config.showMetrics.time ? config.goal.time : undefined,
    }

    const hasAnyGoal = Object.values(filteredGoal).some(value => value !== undefined)
    if (!hasAnyGoal) return undefined

    return calculateActivityProgress(totals, filteredGoal)
  }, [totals, config.goal, config.showMetrics])

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // No data state
  if (!totals || totals.count === 0) {
    return (
      <Card className="relative group">
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            No activities for {getTimeFrameDescription(config.timeFrame, config.customDateRange).toLowerCase()}
          </CardDescription>
        </CardContent>
        <CardFooter>
          <CardConfigDialog existingCard={config} onSave={onUpdate} />
        </CardFooter>
      </Card>
    )
  }

  // Render with data
  return (
    <div className="relative group">
      <ActivityStatsCard
        actions={<CardConfigDialog existingCard={config} onSave={onUpdate} />}
        type={ACTIVITY_CONFIGS[config.activityIds[0]].stravaType}
        title={config.title}
        totals={totals}
        progress={progress}
      />
    </div>
  )
}
