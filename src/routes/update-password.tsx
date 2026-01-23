import { createFileRoute } from '@tanstack/react-router'
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm'

// Note: This page is for updating password after logging in
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
