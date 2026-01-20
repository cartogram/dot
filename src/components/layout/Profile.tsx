import { useAuth } from '@/lib/auth/SimpleAuthContext'
import { Badge } from '@/components/custom/Badge/Badge'
import './styles/profile.css'

export function Profile() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <div className="Profile">
      <div className="Profile__Section">
        {/* <span className="heading--3 Dash">{user.email}</span> */}
        <Badge variant="secondary">
          {new Date(user.created_at).toDateString()}
        </Badge>
        {/* <span className="heading--4">{user.id}</span> */}
      </div>
    </div>
  )
}
