/**
 * DashboardActivityCard Component
 *
 * Displays aggregated activity stats for a dashboard.
 * Similar to DashboardCard but combines activities from all profiles.
 */

import * as React from 'react'
import type { DashboardCard, Metric, TimeFrame } from '@/types/dashboard'
import type { StravaActivity, ActivityTotals } from '@/types/strava'
import type { ProfileActivities } from '@/types/dashboards'
import { activityTypesToStravaTypes } from '@/config/activities'
import {
  filterActivitiesByTimeFrame,
  getTimeFrameDescription,
} from '@/lib/dashboard/timeframes'
import { calculateActivityProgress } from '@/lib/goals/calculations'
import { ActivityStatsCard } from '@/components/stats/ActivityStatsCard'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/custom/Card'
import { CardConfigDialog } from './CardConfigDialog'

interface DashboardActivityCardProps {
  config: DashboardCard
  combinedActivities: StravaActivity[]
  profileActivities: ProfileActivities[]
  canEdit?: boolean
  dashboardId?: string
  onSave?: () => void
}

export function DashboardActivityCard({
  config,
  combinedActivities,
  canEdit,
  dashboardId,
  onSave,
}: DashboardActivityCardProps) {
  // Convert ActivityType enums to Strava type strings
  const stravaTypes = React.useMemo(
    () => activityTypesToStravaTypes(config.activityTypes),
    [config.activityTypes],
  )

  // Filter activities that match the card's activity types
  const cardActivities = React.useMemo(() => {
    if (!combinedActivities || stravaTypes.length === 0) return []
    return combinedActivities.filter((activity) => stravaTypes.includes(activity.type))
  }, [combinedActivities, stravaTypes])

  // Filter activities by the card's time frame
  const filteredCardActivities = React.useMemo(() => {
    return filterActivitiesByTimeFrame(cardActivities, config.timeFrame as TimeFrame)
  }, [cardActivities, config.timeFrame])

  // Aggregate activities based on selected activity types
  const totals = React.useMemo<ActivityTotals | null>(() => {
    if (!filteredCardActivities) return null

    // Aggregate them together
    return filteredCardActivities.reduce(
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
  }, [filteredCardActivities])

  // Calculate progress based on the single metric and goal
  const progress = React.useMemo(() => {
    if (!config.goal || !totals) return undefined

    // Build goal object with just the single metric
    const goal = buildGoalFromMetric(config.metric as Metric, config.goal)

    return calculateActivityProgress(totals, goal, config.timeFrame as TimeFrame)
  }, [totals, config.goal, config.metric, config.timeFrame])

  // Edit action for canEdit mode
  const editAction = canEdit && dashboardId ? (
    <CardConfigDialog
      dashboardId={dashboardId}
      existingCard={config}
      onSave={onSave}
    />
  ) : null

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
          {editAction && <div className="mt-4">{editAction}</div>}
        </CardContent>
      </Card>
    )
  }

  // Render with data
  return (
    <ActivityStatsCard
      types={stravaTypes}
      title={config.title}
      totals={totals}
      timeFrame={config.timeFrame as TimeFrame}
      progress={progress}
      actions={editAction}
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
