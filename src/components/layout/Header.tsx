import * as React from 'react'

import { UserMenu } from '@/components/layout/UserMenu'
import { useAuth } from '@/lib/auth/AuthContext'

import './styles/header.css'

function User() {
  const { user } = useAuth()

  if (!user) return null

  return <UserMenu user={user} />
}

export function Header() {
  return (
    <header className="Header">
      <div className="Header__Item">
        <React.Suspense fallback="loading...">
          <User />
        </React.Suspense>
      </div>
    </header>
  )
}
