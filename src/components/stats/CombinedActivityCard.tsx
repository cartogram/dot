import * as React from 'react'
import type { CombinedActivityGoal, StravaActivity, ActivityTotals } from '@/types/strava'
import { ACTIVITY_CONFIGS } from '@/config/activities'
import { aggregateActivities } from '@/lib/strava/aggregation'
import { getStoredGoals } from '@/lib/goals/storage'
import { calculateActivityProgress } from '@/lib/goals/calculations'
import { ActivityStatsCard } from './ActivityStatsCard'
import { CombinedActivityGoalDialog } from '@/components/goals/CombinedActivityGoalDialog'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface CombinedActivityCardProps {
  combinedGoal: CombinedActivityGoal
  allActivities: StravaActivity[] | undefined
  isLoading: boolean
  onGoalUpdate?: () => void
}

export function CombinedActivityCard({
  combinedGoal,
  allActivities,
  isLoading,
  onGoalUpdate
}: CombinedActivityCardProps) {
  // Aggregate all activities from the combined activity types
  const totals = React.useMemo<ActivityTotals | null>(() => {
    if (isLoading || !allActivities) return null

    // Get all activity types to combine
    const activityTypes = combinedGoal.activityIds
      .map(id => ACTIVITY_CONFIGS[id]?.stravaType)
      .filter(Boolean)

    if (activityTypes.length === 0) return null

    // Filter activities that match any of the types
    const relevantActivities = allActivities.filter(activity =>
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
  }, [combinedGoal.activityIds, allActivities, isLoading])

  // Calculate progress based on combined goal
  const progress = React.useMemo(() => {
    if (!combinedGoal.goal || !totals) return undefined

    const hasAnyGoal = Object.values(combinedGoal.goal).some(value => value !== undefined)
    if (!hasAnyGoal) return undefined

    return calculateActivityProgress(totals, combinedGoal.goal)
  }, [totals, combinedGoal.goal])

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{combinedGoal.name}</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // No totals means no matching activities
  if (!totals) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{combinedGoal.name}</CardTitle>
          <CardDescription>No activities found</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Render with data
  return (
    <ActivityStatsCard
      type={combinedGoal.name}
      totals={totals}
      progress={progress}
      goalButton={
        <CombinedActivityGoalDialog
          existingGoal={combinedGoal}
          onSave={onGoalUpdate}
        />
      }
    />
  )
}
