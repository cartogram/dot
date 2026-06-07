/**
 * ProfileBreakdown Component
 *
 * Shows a breakdown of activities by profile.
 */

import * as React from 'react'
import type { ProfileActivities } from '@/types/dashboards'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/custom/Avatar/Avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/custom/Card'
import { Stack } from '@/components/custom/Stack/Stack'

import './profile-breakdown.css'

interface ProfileBreakdownProps {
  profileActivities: Array<ProfileActivities>
}

export function ProfileBreakdown({ profileActivities }: ProfileBreakdownProps) {
  // Calculate totals for each profile
  const profileStats = React.useMemo(() => {
    return profileActivities.map((pa) => {
      const totalDistance = pa.activities.reduce((sum, a) => sum + a.distance, 0)
      const totalTime = pa.activities.reduce((sum, a) => sum + a.moving_time, 0)
      const totalElevation = pa.activities.reduce((sum, a) => sum + a.total_elevation_gain, 0)

      return {
        ...pa,
        stats: {
          count: pa.activities.length,
          distance: totalDistance,
          time: totalTime,
          elevation: totalElevation,
        },
      }
    })
  }, [profileActivities])

  // Sort by activity count descending
  const sortedProfiles = [...profileStats].sort((a, b) => b.stats.count - a.stats.count)

  const formatDistance = (meters: number) => {
    const km = meters / 1000
    if (km >= 100) return `${Math.round(km)} km`
    return `${km.toFixed(1)} km`
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours >= 100) return `${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <Card state="active">
      <CardHeader>
        <CardTitle>Profile Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="medium">
          {sortedProfiles.map((profile) => {
            const name = profile.athlete
              ? `${profile.athlete.firstname || ''} ${profile.athlete.lastname || ''}`.trim()
              : profile.profile.fullName || 'Unknown'

            const initials = profile.athlete
              ? `${profile.athlete.firstname?.[0] || ''}${profile.athlete.lastname?.[0] || ''}`
              : profile.profile.fullName?.[0] || '?'

            return (
              <div key={profile.userId} className="ProfileBreakdown__Row">
                <div className="ProfileBreakdown__Identity">
                  <Avatar>
                    {profile.athlete?.profile ? (
                      <AvatarImage src={profile.athlete.profile} alt={initials} />
                    ) : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="ProfileBreakdown__Name">{name}</div>
                    {profile.error ? (
                      <div className="ProfileBreakdown__Sub">{profile.error}</div>
                    ) : (
                      <div className="ProfileBreakdown__Sub">
                        {profile.stats.count} activities
                      </div>
                    )}
                  </div>
                </div>
                {!profile.error && profile.stats.count > 0 && (
                  <div className="ProfileBreakdown__Stats">
                    <div>{formatDistance(profile.stats.distance)}</div>
                    <div className="ProfileBreakdown__StatsSub">{formatTime(profile.stats.time)}</div>
                  </div>
                )}
              </div>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}
