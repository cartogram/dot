import { IconMenu2 } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import type { AuthUser } from '@/lib/server/auth'
import { Avatar, AvatarFallback } from '@/components/custom/Avatar/Avatar'
import { getUserDashboards } from '@/lib/server/dashboards'

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
  { label: 'Home', href: '/' },
  { label: 'My Dashboards', href: '/dashboards' },
  { label: 'Settings', href: '/settings' },
]

export function UserMenu({ user }: UserMenuProps) {
  const { data: dashboards } = useQuery({
    queryKey: ['user-dashboards', user.id],
    queryFn: () => getUserDashboards({ data: { userId: user.id } }),
  })

  return (
    <div className="UserMenu flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="UserMenu__Trigger flex items-center gap-2">
          <IconMenu2 size={20} aria-hidden />
          <span className="text-sm font-medium">
            {user.fullName || user.username}
          </span>
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

          {dashboards && dashboards.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Dashboards</DropdownMenuLabel>
                {dashboards.map((dashboard) => (
                  <DropdownMenuItem
                    key={dashboard.id}
                    render={
                      <Link
                        to="/dashboards/$dashboardId"
                        params={{ dashboardId: dashboard.id }}
                      />
                    }
                  >
                    {dashboard.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
