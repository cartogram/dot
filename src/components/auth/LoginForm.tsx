import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/custom/Button/Button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/custom/Input/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/custom/Card'

export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[LoginForm] Login form submitted', { email })
    setIsLoading(true)
    setError(null)

    try {
      console.log('[LoginForm] Calling signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('[LoginForm] signInWithPassword response:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        error: error?.message
      })

      if (error) throw error

      // Wait a bit for onAuthStateChange to fire before navigating
      // This prevents race condition where navigation happens before auth state updates
      console.log('[LoginForm] Login successful, waiting for auth state to settle...')
      await new Promise(resolve => setTimeout(resolve, 100))

      debugger
      // Navigate to home after successful login
      console.log('[LoginForm] Navigating to home...')
      navigate({ to: '/' })
    } catch (err) {
      console.error('[LoginForm] Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to log in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
      <Card >
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
        </CardHeader>
        <CardContent>
        <CardDescription>Enter your credentials to continue</CardDescription>
          <form onSubmit={handleLogin}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </Field>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {error}
                </div>
              )}

              <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Log in'}
              </Button>
            </FieldGroup>
          </form>

          <div className="mt-4 space-y-2 text-center text-sm">
            <div>
              <a href="/reset-password" className="text-primary hover:underline">
                Forgot your password?
              </a>
            </div>
            <div>
              Don't have an account?{' '}
              <a href="/signup" className="text-primary hover:underline">
                Sign up
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
  )
}
