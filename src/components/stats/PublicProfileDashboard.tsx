/**
 * Public Profile Dashboard
 *
 * Read-only view of another user's activity dashboard.
 * Used when viewing someone's profile via shared link.
 */

import * as React from 'react'
import type { ActivityCardConfig } from '@/types/dashboard'
import type { StravaStats, StravaActivity } from '@/types/strava'
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
import { Button } from '@/components/custom/Button/Button'

interface PublicProfileData {
  profile: {
    id: string
    fullName: string | null
    createdAt: string
  }
  athlete: {
    id: number
    firstname: string | null
    lastname: string | null
    city: string | null
    state: string | null
    country: string | null
    profile: string | null
  } | null
  cards: ActivityCardConfig[]
  stats: StravaStats | null
  activities: StravaActivity[]
  error?: string
}

interface PublicProfileDashboardProps {
  profileData: PublicProfileData
}

export function PublicProfileDashboard({
  profileData,
}: PublicProfileDashboardProps) {
  const { profile, athlete, cards, stats, activities, error } = profileData

  // Get display name
  const displayName = athlete
    ? `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim()
    : profile.fullName || 'Anonymous User'

  // Get location
  const location = athlete
    ? [athlete.city, athlete.state, athlete.country].filter(Boolean).join(', ')
    : null

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {athlete?.profile && (
              <img
                src={athlete.profile}
                alt={displayName}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <CardTitle>{displayName}</CardTitle>
              {location && (
                <CardDescription className="mt-1">{location}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Message */}
      {error && (
        <Card state="error">
          <CardHeader>
            <CardTitle>Limited Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{error}</CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Cards */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <ReadOnlyDashboardCard
              key={card.id}
              config={card}
              allActivities={activities}
              stats={stats}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Dashboard Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              This user hasn't set up their dashboard yet.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Back Button */}
      <div className="flex justify-center">
        <Button to="/" variant="secondary">
          Back to Your Dashboard
        </Button>
      </div>
    </div>
  )
}

/**
 * Read-only version of DashboardCard for public profiles.
 * No edit controls - just displays the data.
 */
interface ReadOnlyDashboardCardProps {
  config: ActivityCardConfig
  allActivities: StravaActivity[]
  stats?: StravaStats | null
}

function ReadOnlyDashboardCard({
  config,
  allActivities,
}: ReadOnlyDashboardCardProps) {
  // Filter activities by the card's time frame
  const filteredActivities = React.useMemo(() => {
    return filterActivitiesByTimeFrame(
      allActivities,
      config.timeFrame,
      config.customDateRange,
    )
  }, [allActivities, config.timeFrame, config.customDateRange])

  // Aggregate activities based on selected activity types
  const totals = React.useMemo(() => {
    if (!filteredActivities) return null

    // Get all activity types to combine
    const activityTypes = config.activityIds
      .map((id) => ACTIVITY_CONFIGS[id]?.stravaType)
      .filter(Boolean)

    if (activityTypes.length === 0) return null

    // Filter activities that match any of the types
    const relevantActivities = filteredActivities.filter((activity) =>
      activityTypes.includes(activity.type),
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
      (value) => value !== undefined,
    )
    if (!hasAnyGoal) return undefined

    return calculateActivityProgress(
      totals,
      filteredGoal,
      config.timeFrame,
      config.customDateRange,
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
              config.customDateRange,
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
