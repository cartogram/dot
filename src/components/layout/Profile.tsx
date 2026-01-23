import { useAuth } from '@/lib/auth/AuthContext'
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
          {user.createdAt instanceof Date ? user.createdAt.toDateString() : new Date(user.createdAt).toDateString()}
        </Badge>
        {/* <span className="heading--4">{user.id}</span> */}
      </div>
    </div>
  )
}
