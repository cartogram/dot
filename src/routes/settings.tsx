import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { exchangeCodeForTokens, saveStravaConnection, disconnectStrava } from '@/lib/server/oauth'
import { updateProfile } from '@/lib/server/auth'
import { getUserDashboards, updateDashboard } from '@/lib/server/dashboards'
import { Button } from '@/components/custom/Button/Button'
import { Badge } from '@/components/custom/Badge/Badge'
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

const queryClient = new QueryClient()

function SettingsPage() {
  const { user, stravaDataSource, refreshStravaConnection } = useAuth()

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsPageContent user={user} stravaDataSource={stravaDataSource} refreshStravaConnection={refreshStravaConnection} />
    </QueryClientProvider>
  )
}

function SettingsPageContent({
  user,
  stravaDataSource,
  refreshStravaConnection
}: {
  user: ReturnType<typeof useAuth>['user']
  stravaDataSource: ReturnType<typeof useAuth>['stravaDataSource']
  refreshStravaConnection: ReturnType<typeof useAuth>['refreshStravaConnection']
}) {
  const navigate = useNavigate()
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  // Track if we've already processed the OAuth callback to prevent double-processing
  const oauthProcessedRef = React.useRef(false)

  const queryClient = useQueryClient()

  // Fetch user's dashboards
  const { data: dashboards, isLoading: dashboardsLoading } = useQuery({
    queryKey: ['user-dashboards', user?.id],
    queryFn: () => getUserDashboards({ data: { userId: user!.id } }),
    enabled: !!user,
  })

  // Mutation to toggle dashboard visibility
  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ dashboardId, isPublic }: { dashboardId: string; isPublic: boolean }) =>
      updateDashboard({ data: { dashboardId, userId: user!.id, isPublic } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-dashboards', user?.id] })
    },
  })

  // Mutation to set dashboard as default
  const setDefaultMutation = useMutation({
    mutationFn: ({ dashboardId }: { dashboardId: string }) =>
      updateDashboard({ data: { dashboardId, userId: user!.id, isDefault: true } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-dashboards', user?.id] })
    },
  })

  const profileUrl = user
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${user.username}`
    : ''

  // Mutation to toggle profile visibility
  const toggleProfileVisibilityMutation = useMutation({
    mutationFn: (profilePublic: boolean) =>
      updateProfile({ data: { profilePublic } }),
    onSuccess: () => {
      // Refresh auth context to get updated user data
      window.location.reload()
    },
  })

  const handleCopyProfileLink = async () => {
    if (!profileUrl) return
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Handle OAuth callback
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')

    if (oauthError) {
      setError(`Strava connection failed: ${oauthError}`)
      // Clear the URL params
      window.history.replaceState(null, '', '/settings')
      return
    }

    if (!code || !user) return

    // Prevent processing the same code multiple times
    // (effect can re-run due to dependency changes)
    if (oauthProcessedRef.current) return
    oauthProcessedRef.current = true

    const handleOAuthCallback = async () => {
      setIsConnecting(true)
      try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens({ data: { code } })

        // Save connection via server function
        await saveStravaConnection({ data: { tokens } })

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
      await disconnectStrava({ data: { dataSourceId: stravaDataSource.id } })
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
            {user.fullName}
          </p>
          <p className="heading--4">
            {user.id}
          </p>
          <p className="heading--4">
            {user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt}
          </p>
          <p className="heading--4">
            {user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt}
          </p>
        </CardContent>
      </Card>

      {/* Public Profile Section */}
      <Card state="active">
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Profile Visibility</p>
              <CardDescription>
                {user.profilePublic
                  ? 'Your profile is visible to anyone with your link.'
                  : 'Your profile is hidden from public view.'}
              </CardDescription>
            </div>
            <Button
              variant={user.profilePublic ? 'secondary' : 'primary'}
              onClick={() => toggleProfileVisibilityMutation.mutate(!user.profilePublic)}
              disabled={toggleProfileVisibilityMutation.isPending}
            >
              {toggleProfileVisibilityMutation.isPending
                ? 'Updating...'
                : user.profilePublic
                  ? 'Make Private'
                  : 'Make Public'}
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="font-medium mb-2">Your Profile URL</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={profileUrl}
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border border-border"
              />
              <Button
                onClick={handleCopyProfileLink}
                variant="secondary"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              @{user.username}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dashboards Section */}
      <Card state="active">
        <CardHeader>
          <CardTitle>Dashboards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>
            Create and manage dashboards to track and share activity stats.
          </CardDescription>

          {dashboardsLoading ? (
            <p className="text-sm text-muted-foreground">Loading dashboards...</p>
          ) : dashboards && dashboards.length > 0 ? (
            <div className="space-y-2">
              {dashboards.map((dashboard) => (
                <div
                  key={dashboard.id}
                  className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted transition-colors"
                >
                  <Link
                    to="/dashboards/$dashboardId"
                    params={{ dashboardId: dashboard.id }}
                    className="flex-1"
                  >
                    <p className="font-medium">{dashboard.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {dashboard.profile_count} {dashboard.profile_count === 1 ? 'profile' : 'profiles'}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    {dashboard.current_user_role === 'owner' && (
                      <>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={(e) => {
                            e.preventDefault()
                            toggleVisibilityMutation.mutate({
                              dashboardId: dashboard.id,
                              isPublic: !dashboard.is_public,
                            })
                          }}
                          disabled={toggleVisibilityMutation.isPending}
                        >
                          {dashboard.is_public ? 'Make Private' : 'Make Public'}
                        </Button>
                        {!dashboard.is_default && (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={(e) => {
                              e.preventDefault()
                              setDefaultMutation.mutate({ dashboardId: dashboard.id })
                            }}
                            disabled={setDefaultMutation.isPending}
                          >
                            Set as Default
                          </Button>
                        )}
                      </>
                    )}
                    <div className="flex gap-1">
                      {dashboard.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {dashboard.is_public && (
                        <Badge variant="secondary">Public</Badge>
                      )}
                      <Badge variant={dashboard.current_user_role === 'owner' ? 'primary' : 'secondary'}>
                        {dashboard.current_user_role === 'owner' ? 'Owner' :
                         dashboard.current_user_role === 'editor' ? 'Editor' : 'Viewer'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">You don't have any dashboards yet.</p>
          )}

          <div className="flex gap-2">
            <Button to="/dashboards" variant="secondary">
              View All Dashboards
            </Button>
            <Button to="/dashboards/new" variant="primary">
              Create Dashboard
            </Button>
          </div>
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
                Connected as {(stravaDataSource.athleteData as any)?.firstname}{' '}
                {(stravaDataSource.athleteData as any)?.lastname}
              </p>
              <p className="heading--4">
                Athlete ID: {stravaDataSource.athleteId?.toString()}
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
