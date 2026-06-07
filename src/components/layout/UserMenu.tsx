import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { IconChevronDown } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import type { AuthUser } from '@/lib/server/auth'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/custom/Avatar/Avatar'
import { getUserDashboards } from '@/lib/server/dashboards'
import { IconMoon, IconSun } from '@/components/custom/Icons/Icons'

import './styles/user-menu.css'

function getUserInitials(fullName: string | null | undefined) {
  return fullName
    ? fullName
      .split(' ')
      .map((name) => name[0])
      .join('')
    : ''
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
          <IconChevronDown style={{ width: '1rem', height: '1rem', opacity: 0.6 }} />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="UserMenu__Dropdown" align="end">
          <DropdownMenuItem
            className="UserMenu__Item UserMenu__Username"
            render={<Link to="/$username" params={{ username: user.username }} />}
          >
            <span className='heading--4'>@{user.username}</span>
          </DropdownMenuItem>
          <div className="UserMenu__Separator" />

          <DropdownMenuGroup>

            {dashboards &&
              dashboards.map((dashboard) => (
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

          <div className="UserMenu__Separator" />

          <DropdownMenuItem
            className="UserMenu__Item"
            render={<Link to="/$username" params={{ username: user.username }} />}
          >
            Profile
          </DropdownMenuItem>

          <DropdownMenuItem className="UserMenu__Item" render={<Link to="/settings" />}>
            Settings
          </DropdownMenuItem>

          <DropdownMenuItem
            className="UserMenu__Item "
            onClick={logout}
          >
            Logout

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
                <IconSun style={{ width: "1rem", height: "1rem" }} />
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
                <IconMoon style={{ width: "1rem", height: "1rem" }} />
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
