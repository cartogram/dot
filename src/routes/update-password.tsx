import { createFileRoute } from '@tanstack/react-router'
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm'

// Note: This page is accessed via password reset email links
// The Supabase client will automatically detect the session from the URL hash
// when using the default Supabase password recovery flow
export const Route = createFileRoute('/update-password')({
  component: UpdatePasswordPage,
})

function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <UpdatePasswordForm />
    </div>
  )
}
