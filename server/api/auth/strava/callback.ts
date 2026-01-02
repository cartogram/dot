import { defineEventHandler, getQuery, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const error = query.error as string

  // Handle OAuth denial
  if (error) {
    return sendRedirect(event, '/?error=access_denied')
  }

  if (!code) {
    return sendRedirect(event, '/?error=missing_code')
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    return sendRedirect(event, '/?error=token_exchange_failed')
  }

  const tokens = await tokenResponse.json()

  // Redirect to frontend with tokens in URL hash (client-side only access)
  const redirectUrl = new URL('/', import.meta.env.VITE_APP_URL)
  redirectUrl.hash = encodeURIComponent(JSON.stringify(tokens))

  return sendRedirect(event, redirectUrl.toString())
})
