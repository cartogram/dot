/**
 * GroupCard Component
 *
 * Displays a group in a card format for the groups list.
 */

import { Link } from '@tanstack/react-router'
import type { GroupWithMembers } from '@/types/groups'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/custom/Card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/custom/Avatar/Avatar'
import { Badge } from '@/components/custom/Badge/Badge'

interface GroupCardProps {
  group: GroupWithMembers
}

export function GroupCard({ group }: GroupCardProps) {
  const roleLabel = group.current_user_role === 'owner' ? 'Owner' :
                    group.current_user_role === 'admin' ? 'Admin' : 'Member'

  return (
    <Link to="/group/$groupId" params={{ groupId: group.id }}>
      <Card state="active">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{group.name}</CardTitle>
            <Badge variant={group.current_user_role === 'owner' ? 'primary' : 'secondary'}>
              {roleLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {group.description && (
            <CardDescription>{group.description}</CardDescription>
          )}
          <div className="mt-4">
            <GroupMemberAvatars members={group.members} />
          </div>
        </CardContent>
        <CardFooter>
          <span className="text-sm text-muted-foreground">
            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}

/**
 * Display stacked avatars for group members
 */
function GroupMemberAvatars({ members }: { members: GroupWithMembers['members'] }) {
  // Show max 5 avatars
  const displayMembers = members.slice(0, 5)
  const remainingCount = members.length - 5

  return (
    <div className="flex -space-x-2">
      {displayMembers.map((member) => {
        const initials = member.athlete
          ? `${member.athlete.firstname?.[0] || ''}${member.athlete.lastname?.[0] || ''}`
          : member.profile.full_name?.[0] || member.profile.email[0].toUpperCase()

        return (
          <Avatar key={member.id}>
            {member.athlete?.profile ? (
              <AvatarImage src={member.athlete.profile} alt={initials} />
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
