export const STRAVA_OAUTH_SCOPES = 'activity:read_all,profile:read_all'

export function hasRequiredStravaScopes(scope: string | null | undefined): boolean {
  if (!scope) return false
  const granted = new Set(scope.split(/[,\s]+/).filter(Boolean))
  return STRAVA_OAUTH_SCOPES.split(',').every((s) => granted.has(s))
}

export function startStravaOAuth(): void {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID
  const redirectUri = `${window.location.origin}/settings`

  const authUrl = new URL('https://www.strava.com/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', STRAVA_OAUTH_SCOPES)
  // Force the consent screen so previously-authorized users are re-prompted and
  // actually grant newly-requested scopes. Without this, Strava's default
  // (approval_prompt=auto) silently returns a token with the OLD scope set.
  authUrl.searchParams.set('approval_prompt', 'force')

  window.location.href = authUrl.toString()
}
