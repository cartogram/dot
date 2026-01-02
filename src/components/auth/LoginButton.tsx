import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { IconBrandStrava } from '@tabler/icons-react'

export function LoginButton() {
  const { login, isLoading } = useAuth()

  return (
    <Button onClick={login} disabled={isLoading} size="lg">
      <IconBrandStrava data-icon="inline-start" />
      Connect with Strava
    </Button>
  )
}
