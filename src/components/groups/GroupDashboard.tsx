/**
 * GroupDashboard Component
 *
 * Main dashboard view for a group, showing combined activity stats
 * from all members.
 */

import type { GroupDashboardData } from '@/types/groups'
import { GroupHeader } from './GroupHeader'
import { GroupDashboardCard } from './GroupDashboardCard'
import { GroupMemberBreakdown } from './GroupMemberBreakdown'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/custom/Card'
import { Button } from '@/components/custom/Button/Button'

interface GroupDashboardProps {
  data: GroupDashboardData
  userId: string
  onRefresh: () => void
}

export function GroupDashboard({ data, userId, onRefresh }: GroupDashboardProps) {
  const { cards, combinedActivities, memberActivities, error } = data
  const isAdmin = data.currentUserRole === 'owner' || data.currentUserRole === 'admin'

  // Count members with Strava connected vs. with errors
  const membersWithData = memberActivities.filter(
    (ma) => !ma.error && ma.activities.length > 0,
  ).length
  const membersWithErrors = memberActivities.filter((ma) => ma.error).length

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <GroupHeader data={data} userId={userId} />

      {/* Status Messages */}
      {membersWithErrors > 0 && (
        <Card state="active">
          <CardContent>
            <CardDescription>
              {membersWithErrors} member{membersWithErrors !== 1 ? 's' : ''} without
              Strava data. They may not have connected Strava yet.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card state="error">
          <CardHeader>
            <CardTitle>Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{error}</CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Cards */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <GroupDashboardCard
              key={card.id}
              config={card}
              combinedActivities={combinedActivities}
              memberActivities={memberActivities}
            />
          ))}
        </div>
      ) : (
        <Card state="active">
          <CardHeader>
            <CardTitle>No Dashboard Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {isAdmin
                ? "Add cards to your group's dashboard to track combined activities."
                : "The group dashboard hasn't been set up yet. An admin can add cards."}
            </CardDescription>
            {isAdmin && (
              <Button variant="primary" className="mt-4" onClick={onRefresh}>
                Add Card (Coming Soon)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Member Breakdown */}
      <GroupMemberBreakdown memberActivities={memberActivities} />

      {/* Summary Stats */}
      <Card state="active">
        <CardHeader>
          <CardTitle>Group Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{data.members.length}</div>
              <div className="text-sm text-muted-foreground">Members</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{membersWithData}</div>
              <div className="text-sm text-muted-foreground">With Strava</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{combinedActivities.length}</div>
              <div className="text-sm text-muted-foreground">Total Activities</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{cards.length}</div>
              <div className="text-sm text-muted-foreground">Dashboard Cards</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
