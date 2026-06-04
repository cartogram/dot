import * as React from 'react'
import { CardConfigDialog } from './CardConfigDialog'
import type { DashboardCard as DashboardCardType, Metric, TimeFrame } from '@/types/dashboard'
import type { ActivityTotals, StravaActivity } from '@/types/strava'
import { activityTypesToStravaTypes } from '@/config/activities'
import { filterActivitiesByTimeFrame, getTimeFrameDescription } from '@/lib/dashboard/timeframes'
import { calculateActivityProgress } from '@/lib/goals/calculations'
import { Spinner } from '@/components/ui/spinner'
import { ActivityStatsCard } from '@/components/stats/ActivityStatsCard'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/custom/Card'

interface DashboardCardProps {
  config: DashboardCardType
  dashboardId: string
  allActivities: Array<StravaActivity> | undefined
  isLoading: boolean
  onUpdate: () => void
}

export function DashboardCard({
  config,
  dashboardId,
  allActivities,
  isLoading,
  onUpdate,
}: DashboardCardProps) {
  // Convert ActivityType enums to Strava type strings
  const stravaTypes = React.useMemo(
    () => activityTypesToStravaTypes(config.activityTypes),
    [config.activityTypes],
  )

  // Filter activities that match the card's activity types
  const cardActivities = React.useMemo(() => {
    if (isLoading || !allActivities || stravaTypes.length === 0) return []
    return allActivities.filter((activity) => stravaTypes.includes(activity.type))
  }, [allActivities, stravaTypes, isLoading])

  // Filter activities by the card's time frame
  const filteredCardActivities = React.useMemo(() => {
    return filterActivitiesByTimeFrame(cardActivities, config.timeFrame as TimeFrame)
  }, [cardActivities, config.timeFrame])

  // Aggregate activities based on selected activity types
  const totals = React.useMemo<ActivityTotals | null>(() => {
    if (isLoading) return null

    // Aggregate them together
    return filteredCardActivities.reduce(
      (acc, activity) => ({
        count: acc.count + 1,
        distance: acc.distance + activity.distance,
        moving_time: acc.moving_time + activity.moving_time,
        elapsed_time: acc.elapsed_time + activity.elapsed_time,
        elevation_gain: acc.elevation_gain + activity.total_elevation_gain,
      }),
      {
        count: 0,
        distance: 0,
        moving_time: 0,
        elapsed_time: 0,
        elevation_gain: 0,
      },
    )
  }, [filteredCardActivities, isLoading])

  // Calculate progress based on the single metric and goal
  const progress = React.useMemo(() => {
    if (!config.goal || !totals) return undefined

    // Build goal object with just the single metric
    const goal = buildGoalFromMetric(config.metric as Metric, config.goal)

    return calculateActivityProgress(totals, goal, config.timeFrame as TimeFrame)
  }, [totals, config.goal, config.metric, config.timeFrame])

  // Loading state
  if (isLoading) {
    return (
      <Card state="loading">
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Spinner className="mx-auto" />
        </CardContent>
      </Card>
    )
  }

  // No data state
  if (!totals || totals.count === 0) {
    return (
      <Card state="active">
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            No activities for {getTimeFrameDescription(config.timeFrame as TimeFrame).toLowerCase()}
          </CardDescription>
        </CardContent>
        <CardFooter>
          <CardConfigDialog dashboardId={dashboardId} existingCard={config} onSave={onUpdate} />
        </CardFooter>
      </Card>
    )
  }

  // Render with data
  return (
    <ActivityStatsCard
      actions={
        <CardConfigDialog dashboardId={dashboardId} existingCard={config} onSave={onUpdate} />
      }
      types={stravaTypes}
      title={config.title}
      totals={totals}
      timeFrame={config.timeFrame as TimeFrame}
      progress={progress}
      cardActivities={cardActivities}
      filteredActivities={filteredCardActivities}
      metric={config.metric as Metric}
      goal={config.goal}
    />
  )
}

/**
 * Build an ActivityGoal object from a single metric and goal value
 */
function buildGoalFromMetric(
  metric: Metric,
  goalValue: number,
): {
  distance?: number
  count?: number
  elevation?: number
  time?: number
} {
  switch (metric) {
    case 'distance':
      return { distance: goalValue }
    case 'count':
      return { count: goalValue }
    case 'elevation':
      return { elevation: goalValue }
    case 'time':
      return { time: goalValue }
    default:
      return {}
  }
}
