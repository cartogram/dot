import * as React from 'react'
import { requestPasswordReset } from '@/lib/server/auth'
import { Button } from '@/components/custom/Button/Button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/custom/Input/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/custom/Card'

import './auth-form.css'

export function ResetPasswordForm() {
  const [email, setEmail] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await requestPasswordReset({ data: { email } })
      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card state="active">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
        <form onSubmit={handleResetPassword}>
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

            {error && <div className="AuthForm__Error">{error}</div>}

            {success && (
              <div className="AuthForm__Success">
                If an account exists with that email, you'll receive a password reset link.
              </div>
            )}

            <Button type="submit" className="AuthForm__Submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send reset link'}
            </Button>
          </FieldGroup>
        </form>

        <div className="AuthForm__Footer">
          Remember your password?{' '}
          <a href="/login" className="AuthForm__Link">
            Log in
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
