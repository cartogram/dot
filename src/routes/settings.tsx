import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { disconnectStrava, exchangeCodeForTokens, saveStravaConnection } from '@/lib/server/oauth'
import { startStravaOAuth } from '@/lib/strava/oauth'
import { updateProfile } from '@/lib/server/auth'
import { getUserDashboards, updateDashboard } from '@/lib/server/dashboards'
import { Button, buttonVariants } from '@/components/custom/Button/Button'
import { Badge } from '@/components/custom/Badge/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/custom/Card'

import './settings.css'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user, stravaDataSource, refreshStravaConnection } = useAuth()

  return (
    <SettingsPageContent
      user={user}
      stravaDataSource={stravaDataSource}
      refreshStravaConnection={refreshStravaConnection}
    />
  )
}

function SettingsPageContent({
  user,
  stravaDataSource,
  refreshStravaConnection,
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

  const profileUrl = user ? `${import.meta.env.VITE_APP_URL}/${user.username}` : ''

  // Mutation to toggle profile visibility
  const toggleProfileVisibilityMutation = useMutation({
    mutationFn: (profilePublic: boolean) => updateProfile({ data: { profilePublic } }),
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
        setError(err instanceof Error ? err.message : 'Failed to connect Strava')
      } finally {
        setIsConnecting(false)
      }
    }

    handleOAuthCallback()
  }, [user, navigate, refreshStravaConnection])

  const handleConnectStrava = () => {
    startStravaOAuth()
  }

  const handleDisconnectStrava = async () => {
    if (!stravaDataSource || !user) return

    try {
      await disconnectStrava({ data: { dataSourceId: stravaDataSource.id } })
      await refreshStravaConnection()
    } catch (err) {
      console.error('Failed to disconnect Strava:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect Strava')
    }
  }

  if (!user) {
    return (
      <div className="SettingsPage__Centre">
        <Card className="SettingsPage__CardWide">
          <CardHeader>
            <CardTitle>Connect Strava</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: '/login' })} className="u-w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="SettingsPage">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="SettingsPage__Grid2">
            <div>
              <p>Email</p>
              <p className="heading--4">{user.email}</p>
            </div>
            <div>
              <p>Full Name</p>
              <p className="heading--4">{user.fullName}</p>
            </div>

            <div>
              <p>Created At</p>
              <p className="heading--4">
                {user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt}
              </p>
            </div>
            <div>
              <p>Updated At</p>
              <p className="heading--4">
                {user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt}
              </p>
            </div>
          </div>
          <div>
            <p>ID</p>
            <p className="heading--4">{user.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Public Profile Section */}
      <Card state="active">
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
        </CardHeader>
        <CardContent className="SettingsPage__SectionContent">
          <div className="SettingsPage__Row">
            <div>
              <p className="u-font-medium">Profile Visibility</p>
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

          <div className="SettingsPage__UrlBlock">
            <p className="SettingsPage__UrlBlockLabel">Your Profile URL</p>
            <div className="SettingsPage__UrlInputRow">
              <input
                type="text"
                readOnly
                value={profileUrl}
                className="SettingsPage__UrlInput"
              />
              <Button onClick={handleCopyProfileLink} variant="secondary">
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Link
                to="/$username"
                params={{ username: user.username }}
                className={buttonVariants({ variant: 'secondary' })}
              >
                View
              </Link>
            </div>
            <p className="SettingsPage__Hint">@{user.username}</p>
          </div>
        </CardContent>
      </Card>

      {/* Dashboards Section */}
      <Card state="active">
        <CardHeader>
          <CardTitle>Dashboards</CardTitle>
        </CardHeader>
        <CardContent className="SettingsPage__SectionContent">
          <CardDescription>
            Create and manage dashboards to track and share activity stats.
          </CardDescription>

          {dashboardsLoading ? (
            <p className="u-text-sm u-text-muted">Loading dashboards...</p>
          ) : dashboards && dashboards.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dashboards.map((dashboard) => (
                <div key={dashboard.id} className="SettingsPage__DashboardRow">
                  <Link
                    to="/dashboards/$dashboardId"
                    params={{ dashboardId: dashboard.id }}
                    className="SettingsPage__DashboardLink"
                  >
                    <p className="SettingsPage__DashboardName">{dashboard.name}</p>
                    <p className="SettingsPage__DashboardSub">
                      {dashboard.profileCount}{' '}
                      {dashboard.profileCount === 1 ? 'profile' : 'profiles'}
                    </p>
                  </Link>

                  <div className="SettingsPage__DashboardActions">
                    {dashboard.currentUserRole === 'owner' && (
                      <>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={(e) => {
                            e.preventDefault()
                            toggleVisibilityMutation.mutate({
                              dashboardId: dashboard.id,
                              isPublic: !dashboard.isPublic,
                            })
                          }}
                          disabled={toggleVisibilityMutation.isPending}
                        >
                          {dashboard.isPublic ? 'Make Private' : 'Make Public'}
                        </Button>
                        {!dashboard.isDefault && (
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

                  </div>

                </div>
              ))}
            </div>
          ) : (
            <p className="u-text-sm u-text-muted">You don't have any dashboards yet.</p>
          )}

          <div className="SettingsPage__FooterActions">
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
        <CardContent className="SettingsPage__SectionContent">
          {error && <div className="SettingsPage__Error">{error}</div>}

          {stravaDataSource ? (
            <>
              <p className="heading--3">
                Connected as {stravaDataSource.athleteData?.firstname}{' '}
                {stravaDataSource.athleteData?.lastname}
              </p>
              <p className="heading--4">Athlete ID: {stravaDataSource.athleteId?.toString()}</p>

              <Button
                onClick={handleDisconnectStrava}
                variant="primary"
                destructive
                style={{ flex: 1 }}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnectStrava}
              disabled={isConnecting}
              className="u-w-full"
              variant="primary"
            >
              {isConnecting ? 'Connecting...' : 'Connect with Strava'}
            </Button>
          )}
        </CardContent>
      </Card>
      <Button to="/" variant="primary">
        Back to Dashboard
      </Button>
      {/* <div>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      <pre>{JSON.stringify(stravaDataSource, null, 2)}</pre>
    </div> */}
    </div>
  )
}
