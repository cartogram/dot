import { IconChevronDown } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Button } from '../custom/Button/Button'
import type { AuthUser } from '@/lib/server/auth'
import { Avatar, AvatarFallback } from '@/components/custom/Avatar/Avatar'

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
    <div className="UserMenu flex items-center gap-3">

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarFallback>{getUserInitials(user.fullName)}</AvatarFallback>
          </Avatar>

        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {links.map((link) => (
            <DropdownMenuItem key={link.href} render={<Link to={link.href} />}>
              {link.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
