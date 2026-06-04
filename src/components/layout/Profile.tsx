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
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Badge>
      </div>
    </div>
  )
}
