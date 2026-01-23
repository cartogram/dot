/**
 * DashboardListCard Component
 *
 * Displays a dashboard in a card format for the dashboards list.
 */

import { Link } from '@tanstack/react-router'
import type { DashboardWithProfiles } from '@/types/dashboards'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/custom/Card'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/custom/Avatar/Avatar'
import { Badge } from '@/components/custom/Badge/Badge'

interface DashboardListCardProps {
  dashboard: DashboardWithProfiles
}

export function DashboardListCard({ dashboard }: DashboardListCardProps) {
  const roleLabel =
    dashboard.current_user_role === 'owner'
      ? 'Owner'
      : dashboard.current_user_role === 'editor'
        ? 'Editor'
        : 'Viewer'

  const roleVariant =
    dashboard.current_user_role === 'owner'
      ? 'primary'
      : 'secondary'

  return (
    <Link to="/dashboards/$dashboardId" params={{ dashboardId: dashboard.id }}>
      <Card state="active">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{dashboard.name}</CardTitle>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {dashboard.is_default && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
              {dashboard.is_public && (
                <Badge variant="secondary" className="text-xs">
                  Public
                </Badge>
              )}
              <Badge variant={roleVariant}>{roleLabel}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dashboard.description && (
            <CardDescription className="line-clamp-2">
              {dashboard.description}
            </CardDescription>
          )}
          <div className="mt-4">
            <ProfileAvatars profiles={dashboard.profiles} />
          </div>
        </CardContent>
        <CardFooter>
          <span className="text-sm text-muted-foreground">
            {dashboard.profile_count}{' '}
            {dashboard.profile_count === 1 ? 'profile' : 'profiles'}
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}

/**
 * Display stacked avatars for dashboard profiles
 */
function ProfileAvatars({
  profiles,
}: {
  profiles: DashboardWithProfiles['profiles']
}) {
  // Show max 5 avatars
  const displayProfiles = profiles.slice(0, 5)
  const remainingCount = profiles.length - 5

  return (
    <div className="flex -space-x-2">
      {displayProfiles.map((profile) => {
        const initials = profile.athlete
          ? `${profile.athlete.firstname?.[0] || ''}${profile.athlete.lastname?.[0] || ''}`
          : profile.profile.full_name?.[0] ||
            profile.profile.email[0].toUpperCase()

        return (
          <Avatar key={profile.id}>
            {profile.athlete?.profile ? (
              <AvatarImage src={profile.athlete.profile} alt={initials} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        )
      })}
      {remainingCount > 0 && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
