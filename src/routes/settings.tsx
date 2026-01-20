import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { exchangeCodeForTokens } from '@/lib/server/oauth'
import { Button } from '@/components/custom/Button/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/custom/Card'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const navigate = useNavigate()
  const { user, stravaDataSource, refreshStravaConnection } = useAuth()
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Handle OAuth callback
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')

    if (oauthError) {
      setError(`Strava connection failed: ${oauthError}`)
      return
    }

    if (!code || !user) return

    const handleOAuthCallback = async () => {
      setIsConnecting(true)
      try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens({ data: { code } })

        // Check if connection already exists
        const { data: existing } = await (supabase.from('data_sources') as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('provider', 'strava')
          .maybeSingle()

        const connectionData = {
          user_id: user.id,
          provider: 'strava',
          athlete_id: tokens.athlete.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(tokens.expires_at * 1000).toISOString(),
          token_type: tokens.token_type,
          athlete_data: tokens.athlete,
          is_active: true,
          last_synced_at: new Date().toISOString(),
        }

        if (existing) {
          // Update existing connection (re-enable if previously disconnected)
          const { error } = await (supabase.from('data_sources') as any)
            .update(connectionData)
            .eq('id', existing.id)

          if (error) throw error
        } else {
          // Insert new connection
          const { error } = await (supabase.from('data_sources') as any).insert(
            connectionData,
          )

          if (error) throw error
        }

        // Update user metadata with Strava avatar and name
        if (tokens.athlete.profile) {
          await supabase.auth.updateUser({
            data: {
              avatar_url: tokens.athlete.profile,
              full_name: `${tokens.athlete.firstname} ${tokens.athlete.lastname}`,
            },
          })
        }

        // Refresh the auth context
        await refreshStravaConnection()

        // Clean up URL and redirect
        window.history.replaceState(null, '', '/settings')
        navigate({ to: '/' })
      } catch (err) {
        console.error('Failed to connect Strava:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to connect Strava',
        )
      } finally {
        setIsConnecting(false)
      }
    }

    handleOAuthCallback()
  }, [user, navigate, refreshStravaConnection])

  const handleConnectStrava = () => {
    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID
    const redirectUri = `${window.location.origin}/settings`
    const scope = 'activity:read_all'

    const authUrl = new URL('https://www.strava.com/oauth/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)

    window.location.href = authUrl.toString()
  }

  const handleDisconnectStrava = async () => {
    if (!stravaDataSource || !user) return

    try {
      const { error } = await (supabase.from('data_sources') as any)
        .update({ is_active: false })
        .eq('id', stravaDataSource.id)
        .eq('user_id', user?.id)

      if (error) throw error

      await refreshStravaConnection()
    } catch (err) {
      console.error('Failed to disconnect Strava:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to disconnect Strava',
      )
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connect Strava</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate({ to: '/login' })}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="heading--3">
            {user.email}
          </p>
          <p className="heading--4">
            {user.user_metadata.full_name}
          </p>
          <p className="heading--4">
            {user.id}
          </p>
          <p className="heading--4">
            {user.created_at}
          </p>
          <p className="heading--4">
            {user.updated_at}
          </p>
        </CardContent>
      </Card>
    <Card state="active">
      <CardHeader>
        <CardTitle>Strava</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
         
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {stravaDataSource ? (
          <>
              <p className="heading--3">
                Connected as {stravaDataSource.athlete_data?.firstname}{' '}
                {stravaDataSource.athlete_data?.lastname}
              </p>
              <p className="heading--4">
                Athlete ID: {stravaDataSource.athlete_id}
              </p>

            
              <Button
                onClick={handleDisconnectStrava}
                variant="primary"
                destructive
                className="flex-1"
              >
                Disconnect
              </Button>
          </>
        ) : (
          <Button
            onClick={handleConnectStrava}
            disabled={isConnecting}
            className="w-full"
            variant="primary"
          >
            {isConnecting ? 'Connecting...' : 'Connect with Strava'}
          </Button>
        )}
      </CardContent>
    </Card>
     <Button to="/" variant="primary" >
     Back to Dashboard
    </Button>
    {/* <div>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      <pre>{JSON.stringify(stravaDataSource, null, 2)}</pre>
    </div> */}
    </div>
  )
}
