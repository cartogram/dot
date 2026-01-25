import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/custom/Avatar/Avatar'
import type { AuthUser } from '@/lib/server/auth'
import { useAuth } from '@/lib/auth/AuthContext'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Button } from '../custom/Button/Button'
import { IconUser } from '../custom/Icons/Icons'
import { Link } from '@tanstack/react-router'

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

const links = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'My Dashboards',
    href: '/dashboards',
  },
  {
    label: 'Settings',
    href: '/settings',
  },


]

export function UserMenu({ user }: UserMenuProps) {

  return (
    <div className="UserMenu">

      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer">
          <Avatar>
            <AvatarFallback>
              {getUserInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {links.map((link) => (
            <DropdownMenuItem key={link.href}>
              <Link to={link.href}>{link.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
