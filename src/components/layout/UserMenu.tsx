import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import type { AuthUser } from '@/lib/server/auth'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/custom/Avatar/Avatar'
import { getUserDashboards } from '@/lib/server/dashboards'
import { IconMoon, IconSignOut, IconSun } from '@/components/custom/Icons/Icons'

import './styles/user-menu.css'

function getUserInitials(fullName: string | null | undefined) {
  return fullName
    ? fullName
      .split(' ')
      .map((name) => name[0])
      .join('')
    : ''
}

// Custom Cosmos Icons
function IconMenu({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      className={className}
      {...props}
    >
      <line x1="5" y1="9" x2="19" y2="9" />
      <line x1="5" y1="15" x2="19" y2="15" />
    </svg>
  )
}

function IconClose({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      className={className}
      {...props}
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

function IconSystem({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20" />
      <path d="M12 12h10A10 10 0 0 0 12 2" fill="currentColor" />
    </svg>
  )
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
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { logout } = useAuth()

  const { data: dashboards } = useQuery({
    queryKey: ['user-dashboards', user.id],
    queryFn: () => getUserDashboards({ data: { userId: user.id } }),
  })

  return (
    <div className="UserMenu">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger className="UserMenu__Trigger">
          <Avatar size="md">
            <AvatarFallback>{getUserInitials(user.fullName)}</AvatarFallback>
          </Avatar>
          <span className="UserMenu__Username">{user.fullName || user.username}</span>
          {isOpen ? <IconClose /> : <IconMenu />}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="UserMenu__Dropdown" align="end">
          {links.map((link) => (
            <DropdownMenuItem
              key={link.href}
              className="UserMenu__Item"
              render={<Link to={link.href} />}
            >
              <span>{link.label}</span>
            </DropdownMenuItem>
          ))}

          {dashboards && dashboards.length > 0 && (
            <>
              <div className="UserMenu__Separator" />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="">Dashboards</DropdownMenuLabel>
                {dashboards.map((dashboard) => (
                  <DropdownMenuItem
                    key={dashboard.id}
                    className="UserMenu__Item"
                    render={
                      <Link to="/dashboards/$dashboardId" params={{ dashboardId: dashboard.id }} />
                    }
                  >
                    <span>{dashboard.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}

          <div className="UserMenu__Separator" />

          <DropdownMenuItem
            className="UserMenu__Item text-destructive hover:bg-destructive/10"
            onClick={logout}
          >
            <span>Logout</span>
            <span className="UserMenu__Item-Icon">
              <IconSignOut />
            </span>
          </DropdownMenuItem>

          <div className="ThemeSelectorRow">
            <span className="ThemeSelectorRow__Label">Theme</span>
            <div className="ThemeSelector">
              <button
                type="button"
                className={cn(
                  'ThemeSelector__Button',
                  theme === 'light' && 'ThemeSelector__Button--active',
                )}
                onClick={() => setTheme('light')}
                title="Light Theme"
              >
                <IconSun className="size-4" />
              </button>
              <button
                type="button"
                className={cn(
                  'ThemeSelector__Button',
                  theme === 'dark' && 'ThemeSelector__Button--active',
                )}
                onClick={() => setTheme('dark')}
                title="Dark Theme"
              >
                <IconMoon className="size-4" />
              </button>
              <button
                type="button"
                className={cn(
                  'ThemeSelector__Button',
                  theme === 'system' && 'ThemeSelector__Button--active',
                )}
                onClick={() => setTheme('system')}
                title="System Theme"
              >
                <IconSystem />
              </button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
