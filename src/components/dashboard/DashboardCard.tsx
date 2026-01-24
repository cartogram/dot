import * as React from 'react'
import type { DashboardCard as DashboardCardType, Metric } from '@/types/dashboard'
import type { StravaActivity, ActivityTotals } from '@/types/strava'
import { activityTypesToStravaTypes } from '@/config/activities'
import {
  filterActivitiesByTimeFrame,
  getTimeFrameDescription,
} from '@/lib/dashboard/timeframes'
import { calculateActivityProgress } from '@/lib/goals/calculations'
import { Spinner } from '@/components/ui/spinner'
import { ActivityStatsCard } from '@/components/stats/ActivityStatsCard'
import { CardConfigDialog } from './CardConfigDialog'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/custom/Card'

interface DashboardCardProps {
  config: DashboardCardType
  dashboardId: string
  allActivities: StravaActivity[] | undefined
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

  // Filter activities by the card's time frame
  const filteredActivities = React.useMemo(() => {




    return filterActivitiesByTimeFrame(allActivities, config.timeFrame as TimeFrame)
  }, [allActivities, config.timeFrame])

  // Aggregate activities based on selected activity types
  const totals = React.useMemo<ActivityTotals | null>(() => {
    if (isLoading || !filteredActivities) return null

    if (stravaTypes.length === 0) return null

    // Filter activities that match any of the types
    const relevantActivities = filteredActivities.filter((activity) =>
      stravaTypes.includes(activity.type),
    )

    // Aggregate them together
    return relevantActivities.reduce(
      (totals, activity) => ({
        count: totals.count + 1,
        distance: totals.distance + activity.distance,
        moving_time: totals.moving_time + activity.moving_time,
        elapsed_time: totals.elapsed_time + activity.elapsed_time,
        elevation_gain: totals.elevation_gain + activity.total_elevation_gain,
      }),
      {
        count: 0,
        distance: 0,
        moving_time: 0,
        elapsed_time: 0,
        elevation_gain: 0,
      },
    )
  }, [stravaTypes, filteredActivities, isLoading])

  // Calculate progress based on the single metric and goal
  const progress = React.useMemo(() => {
    if (!config.goal || !totals) return undefined

    // Build goal object with just the single metric
    const goal = buildGoalFromMetric(config.metric, config.goal)

    return calculateActivityProgress(totals, goal, config.timeFrame)
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
            No activities for {getTimeFrameDescription(config.timeFrame).toLowerCase()}
          </CardDescription>
        </CardContent>
        <CardFooter>
          <CardConfigDialog
            dashboardId={dashboardId}
            existingCard={config}
            onSave={onUpdate}
          />
        </CardFooter>
      </Card>
    )
  }

  // Render with data
  return (
    <ActivityStatsCard
      actions={
        <CardConfigDialog
          dashboardId={dashboardId}
          existingCard={config}
          onSave={onUpdate}
        />
      }
      types={stravaTypes}
      title={config.title}
      totals={totals}
      timeFrame={config.timeFrame}
      progress={progress}
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
