/**
 * DashboardListCard Component
 *
 * Displays a dashboard in a card format for the dashboards list.
 */

import { Link } from '@tanstack/react-router'
import type { DashboardWithProfiles } from '@/types/dashboards'
import type { AvatarGroupItem } from '@/components/custom/Avatar/AvatarGroup'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/custom/Card'
import { AvatarGroup } from '@/components/custom/Avatar/AvatarGroup'
import { Badge } from '@/components/custom/Badge/Badge'
import { Row } from '@/components/custom/Row/Row'

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

  const roleVariant = dashboard.current_user_role === 'owner' ? 'primary' : 'secondary'

  return (
    <Link to="/dashboards/$dashboardId" params={{ dashboardId: dashboard.id }}>
      <Card state="active">
        <CardHeader>
          <CardTitle className="u-truncate">{dashboard.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Row gap="xsmall" wrap>
            {dashboard.isDefault && <Badge variant="secondary">Default</Badge>}
            {dashboard.isPublic && <Badge variant="secondary">Public</Badge>}
            <Badge variant="secondary">{roleLabel}</Badge>
          </Row>
          {dashboard.description && <CardDescription>{dashboard.description}</CardDescription>}
          <div style={{ marginTop: '1rem' }}>
            <ProfileAvatars profiles={dashboard.profiles} />
          </div>
        </CardContent>
        <CardFooter>
          <span className="u-text-sm u-text-muted">
            {dashboard.profileCount} {dashboard.profileCount === 1 ? 'profile' : 'profiles'}
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}

function ProfileAvatars({ profiles }: { profiles: DashboardWithProfiles['profiles'] }) {
  const items: Array<AvatarGroupItem> = profiles.map((profile) => {
    const initials = profile.athlete
      ? `${profile.athlete.firstname?.[0] || ''}${profile.athlete.lastname?.[0] || ''}`
      : profile.profile.fullName?.[0] || profile.profile.email[0].toUpperCase()
    return {
      id: profile.id,
      src: profile.athlete?.profile ?? null,
      fallback: initials,
      alt: profile.profile.fullName ?? profile.profile.email,
    }
  })

  return <AvatarGroup items={items} max={5} size="md" />
}
