import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '@/components/auth/SignupForm'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SignupForm />
    </div>
  )
}
