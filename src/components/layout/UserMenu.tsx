
import { Avatar, AvatarFallback, AvatarImage } from '@/components/custom/Avatar/Avatar'
import type { User } from '@supabase/supabase-js'


function getUserInitials(fullName: string | undefined) {
  return fullName ? fullName.split(' ').map(name => name[0]).join('') : ''
}


interface UserMenuProps {
  user: User
}


export function UserMenu({ user }: UserMenuProps) {
  console.log(user)

  return (
    <div className="UserMenu">
      <a href="/settings">
        <Avatar>
          <AvatarImage src={user.user_metadata.avatar_url} />
          <AvatarFallback>
            {getUserInitials(user.user_metadata.full_name)}
          </AvatarFallback>
        </Avatar>
      </a>
    </div>
  )
}
