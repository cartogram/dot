/**
 * GroupMemberBreakdown Component
 *
 * Shows a breakdown of activities by member.
 */

import * as React from 'react'
import type { MemberActivities } from '@/types/groups'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/custom/Avatar/Avatar'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/custom/Card'

interface GroupMemberBreakdownProps {
  memberActivities: MemberActivities[]
}

export function GroupMemberBreakdown({ memberActivities }: GroupMemberBreakdownProps) {
  // Calculate totals for each member
  const memberStats = React.useMemo(() => {
    return memberActivities.map((ma) => {
      const totalDistance = ma.activities.reduce((sum, a) => sum + a.distance, 0)
      const totalTime = ma.activities.reduce((sum, a) => sum + a.moving_time, 0)
      const totalElevation = ma.activities.reduce(
        (sum, a) => sum + a.total_elevation_gain,
        0,
      )

      return {
        ...ma,
        stats: {
          count: ma.activities.length,
          distance: totalDistance,
          time: totalTime,
          elevation: totalElevation,
        },
      }
    })
  }, [memberActivities])

  // Sort by activity count descending
  const sortedMembers = [...memberStats].sort(
    (a, b) => b.stats.count - a.stats.count,
  )

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
        <CardTitle>Member Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedMembers.map((member) => {
            const name = member.athlete
              ? `${member.athlete.firstname || ''} ${member.athlete.lastname || ''}`.trim()
              : member.profile.fullName || 'Unknown'

            const initials = member.athlete
              ? `${member.athlete.firstname?.[0] || ''}${member.athlete.lastname?.[0] || ''}`
              : member.profile.fullName?.[0] || '?'

            return (
              <div
                key={member.userId}
                className="flex items-center justify-between py-2 border-b border-muted last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    {member.athlete?.profile ? (
                      <AvatarImage src={member.athlete.profile} alt={initials} />
                    ) : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{name}</div>
                    {member.error ? (
                      <div className="text-sm text-muted-foreground">
                        {member.error}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {member.stats.count} activities
                      </div>
                    )}
                  </div>
                </div>
                {!member.error && member.stats.count > 0 && (
                  <div className="text-right text-sm">
                    <div>{formatDistance(member.stats.distance)}</div>
                    <div className="text-muted-foreground">
                      {formatTime(member.stats.time)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
