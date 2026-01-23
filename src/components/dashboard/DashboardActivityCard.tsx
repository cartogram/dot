/**
 * DashboardActivityCard Component
 *
 * Displays aggregated activity stats for a dashboard.
 * Similar to DashboardCard but combines activities from all profiles.
 */

import * as React from 'react'
import type { ActivityCardConfig } from '@/types/dashboard'
import type { StravaActivity, ActivityTotals } from '@/types/strava'
import type { ProfileActivities } from '@/types/dashboards'
import { ACTIVITY_CONFIGS } from '@/config/activities'
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

interface DashboardActivityCardProps {
  config: ActivityCardConfig
  combinedActivities: StravaActivity[]
  profileActivities: ProfileActivities[]
}

export function DashboardActivityCard({
  config,
  combinedActivities,
}: DashboardActivityCardProps) {
  // Filter activities by the card's time frame
  const filteredActivities = React.useMemo(() => {
    return filterActivitiesByTimeFrame(
      combinedActivities,
      config.timeFrame,
      config.customDateRange
    )
  }, [combinedActivities, config.timeFrame, config.customDateRange])

  // Aggregate activities based on selected activity types
  const totals = React.useMemo<ActivityTotals | null>(() => {
    if (!filteredActivities) return null

    // Get all activity types to combine
    const activityTypes = config.activityIds
      .map((id) => ACTIVITY_CONFIGS[id]?.stravaType)
      .filter(Boolean)

    if (activityTypes.length === 0) return null

    // Filter activities that match any of the types
    const relevantActivities = filteredActivities.filter((activity) =>
      activityTypes.includes(activity.type)
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
      }
    )
  }, [config.activityIds, filteredActivities])

  // Calculate progress based on goals and shown metrics
  const progress = React.useMemo(() => {
    if (!config.goal || !totals) return undefined

    // Only calculate progress for metrics that are shown
    const filteredGoal = {
      distance: config.showMetrics.distance ? config.goal.distance : undefined,
      count: config.showMetrics.count ? config.goal.count : undefined,
      elevation: config.showMetrics.elevation
        ? config.goal.elevation
        : undefined,
      time: config.showMetrics.time ? config.goal.time : undefined,
    }

    const hasAnyGoal = Object.values(filteredGoal).some(
      (value) => value !== undefined
    )
    if (!hasAnyGoal) return undefined

    return calculateActivityProgress(
      totals,
      filteredGoal,
      config.timeFrame,
      config.customDateRange
    )
  }, [
    totals,
    config.goal,
    config.showMetrics,
    config.timeFrame,
    config.customDateRange,
  ])

  // No data state
  if (!totals || totals.count === 0) {
    return (
      <Card state="active">
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            No activities for{' '}
            {getTimeFrameDescription(
              config.timeFrame,
              config.customDateRange
            ).toLowerCase()}
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  // Render with data
  return (
    <ActivityStatsCard
      types={config.activityIds.map((id) => ACTIVITY_CONFIGS[id]?.stravaType)}
      title={config.title}
      totals={totals}
      timeFrame={config.timeFrame}
      customDateRange={config.customDateRange}
      progress={progress}
    />
  )
}
