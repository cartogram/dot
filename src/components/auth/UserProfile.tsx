import { useAuth } from '@/lib/auth/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { IconLogout, IconUser } from '@tabler/icons-react'

export function UserProfile() {
  const { athlete, logout } = useAuth()

  if (!athlete) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        {athlete.profile ? (
          <img
            src={athlete.profile}
            alt={`${athlete.firstname} ${athlete.lastname}`}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <IconUser />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {athlete.firstname} {athlete.lastname}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <IconLogout />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
