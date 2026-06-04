/**
 * Public Profile Dashboard
 *
 * Read-only view of another user's activity dashboard.
 * Used when viewing someone's profile via shared link.
 */

import * as React from 'react'
import type { DashboardCard, Metric } from '@/types/dashboard'
import type { ActivityTotals, StravaActivity, StravaStats } from '@/types/strava'
import { activityTypesToStravaTypes } from '@/config/activities'
import { filterActivitiesByTimeFrame, getTimeFrameDescription } from '@/lib/dashboard/timeframes'
import { calculateActivityProgress } from '@/lib/goals/calculations'
import { ActivityStatsCard } from '@/components/stats/ActivityStatsCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/custom/Card'
import { Button } from '@/components/custom/Button/Button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/custom/Avatar/Avatar'
import { Badge } from '@/components/custom/Badge/Badge'
import { Grid } from '@/components/custom/Grid/Grid'

interface PublicProfileData {
  profile: {
    id: string
    username: string
    fullName: string | null
    profilePublic: boolean
    createdAt: string | Date
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
  cards: Array<DashboardCard>
  stats: StravaStats | null
  activities: Array<StravaActivity>
  error?: string
}

interface PublicProfileDashboardProps {
  profileData: PublicProfileData
}

export function PublicProfileDashboard({ profileData }: PublicProfileDashboardProps) {
  const { profile, athlete, cards, stats, activities, error } = profileData

  // Get display name
  const displayName = athlete
    ? `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim()
    : profile.fullName || 'Anonymous User'

  // Get location
  const location = athlete
    ? [athlete.city, athlete.state, athlete.country].filter(Boolean).join(', ')
    : null

  const initials = athlete
    ? `${athlete.firstname?.[0] || ''}${athlete.lastname?.[0] || ''}`
    : profile.fullName?.[0] || profile.username[0].toUpperCase()

  return (
    <div className="space-y-6 flex flex-col gap-4">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle>@{profile.username}</CardTitle>

        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">

            {location && <Badge variant="secondary">{location}</Badge>}
          </div>

          <div>
            <div className="flex flex-col gap-4 items-center">
              <Avatar size="lg">
                {athlete?.profile ? <AvatarImage src={athlete.profile} alt={initials} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="heading--2">{displayName}</span>
              <Badge variant="primary">Public Profile</Badge>
            </div>
          </div>
        </CardContent>
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
        <Grid>
          {cards.map((card) => (
            <ReadOnlyDashboardCard
              key={card.id}
              config={card}
              allActivities={activities}
              stats={stats}
            />
          ))}
        </Grid>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Dashboard Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>This user hasn't set up their dashboard yet.</CardDescription>
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
  config: DashboardCard
  allActivities: Array<StravaActivity>
  stats?: StravaStats | null
}

function ReadOnlyDashboardCard({ config, allActivities }: ReadOnlyDashboardCardProps) {
  // Convert ActivityType enums to Strava type strings
  const stravaTypes = React.useMemo(
    () => activityTypesToStravaTypes(config.activityTypes),
    [config.activityTypes],
  )

  // Filter activities by the card's time frame
  const filteredActivities = React.useMemo(() => {
    return filterActivitiesByTimeFrame(allActivities, config.timeFrame)
  }, [allActivities, config.timeFrame])

  // Aggregate activities based on selected activity types
  const totals = React.useMemo<ActivityTotals | null>(() => {
    if (stravaTypes.length === 0) return null

    // Filter activities that match any of the types
    const relevantActivities = filteredActivities.filter((activity) =>
      stravaTypes.includes(activity.type),
    )

    // Aggregate them together
    return relevantActivities.reduce(
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
  }, [stravaTypes, filteredActivities])

  // Calculate progress based on the single metric and goal
  const progress = React.useMemo(() => {
    if (!config.goal || !totals) return undefined

    // Build goal object with just the single metric
    const goal = buildGoalFromMetric(config.metric, config.goal)

    return calculateActivityProgress(totals, goal, config.timeFrame)
  }, [totals, config.goal, config.metric, config.timeFrame])

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
      </Card>
    )
  }

  // Render with data
  return (
    <ActivityStatsCard
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
