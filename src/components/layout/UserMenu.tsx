import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/custom/Avatar/Avatar'
import type { AuthUser } from '@/lib/server/auth'

function getUserInitials(fullName: string | null | undefined) {
  return fullName
    ? fullName
        .split(' ')
        .map((name) => name[0])
        .join('')
    : ''
}

interface UserMenuProps {
  user: AuthUser
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="UserMenu">
      <a href="/settings">
        <Avatar>
          <AvatarFallback>
            {getUserInitials(user.fullName)}
          </AvatarFallback>
        </Avatar>
      </a>
    </div>
  )
}
