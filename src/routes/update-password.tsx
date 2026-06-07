import { createFileRoute } from '@tanstack/react-router'
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm'

// Note: This page is for updating password after logging in
export const Route = createFileRoute('/update-password')({
  component: UpdatePasswordPage,
})

function UpdatePasswordPage() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 1rem',
      }}
    >
      <UpdatePasswordForm />
    </div>
  )
}
