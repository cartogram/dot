import * as React from 'react'

import { UserMenu } from '@/components/layout/UserMenu'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/custom/Button/Button'
import { IconSignOut } from '@/components/custom/Icons/Icons'
import { useAuth } from '@/lib/auth/SimpleAuthContext'


import './styles/header.css'

function User() {
  const { user } = useAuth()

  if (!user) return null

  return <UserMenu user={user} />
}

function LogoutForm() {
  const { logout, user } = useAuth()

  if (!user) return null

  return (
    <Button onClick={logout}>
      <IconSignOut className="Icon" />
      <span className="sr-only">Sign Out</span>
    </Button>
  )
}

export function Header() {
  return (
    <header className="Header">
      <div className="Header__Item">
        <React.Suspense fallback="loading...">
          <User />
        </React.Suspense>
      </div>
      <div className="Header__Item">
        <ThemeToggle />
        <LogoutForm />
      </div>
    </header>
  )
}
