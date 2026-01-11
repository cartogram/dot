
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar'
import type { User } from '@supabase/supabase-js'


function getUserInitials(fullName: string | undefined) {
  return fullName ? fullName.split(' ').map(name => name[0]).join('') : ''
}


interface UserMenuProps {
  user: User
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="UserMenu">
      <a href="/settings">
        <Avatar>
          <AvatarImage src={user.id} />
          <AvatarFallback>
            {getUserInitials(user.user_metadata.full_name)}
          </AvatarFallback>
        </Avatar>
      </a>
    </div>
  )
}
