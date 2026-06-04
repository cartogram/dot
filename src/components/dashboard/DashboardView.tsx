/**
 * DashboardView Component
 *
 * Main dashboard view, showing combined activity stats from all attached profiles.
 */

import { DashboardHeader } from './DashboardHeader'
import { DashboardActivityCard } from './DashboardActivityCard'
import { ProfileBreakdown } from './ProfileBreakdown'
import { CardConfigDialog } from './CardConfigDialog'
import type { DashboardData } from '@/types/dashboards'
import { Grid } from '@/components/custom/Grid/Grid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/custom/Card'

interface DashboardViewProps {
  data: DashboardData
  userId: string
  onRefresh: () => void
}

export function DashboardView({ data, userId, onRefresh }: DashboardViewProps) {
  const { cards, combinedActivities, profileActivities, error } = data

  // Count profiles with Strava connected vs. with errors
  const profilesWithData = profileActivities.filter(
    (pa) => !pa.error && pa.activities.length > 0,
  ).length
  const profilesWithErrors = profileActivities.filter((pa) => pa.error).length

  return (
    <div className="gap-6 flex flex-col">
      {/* Dashboard Header */}
      <DashboardHeader
        data={data}
        userId={userId}
        onRefresh={onRefresh}
        stats={{
          profileCount: data.profiles.length,
          profilesWithData,
          totalActivities: combinedActivities.length,
          cardCount: cards.length,
        }}
      />

      {/* Status Messages */}
      {profilesWithErrors > 0 && (
        <Card state="active">
          <CardHeader>
            <CardTitle>Missing Strava data</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {profilesWithErrors} profile
              {profilesWithErrors !== 1 ? 's' : ''} without Strava data. They may not have connected
              Strava yet.
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
      {data.canEdit && (
        <div className="flex justify-center">
          <CardConfigDialog dashboardId={data.dashboard.id} onSave={onRefresh} />
        </div>
      )}
      {/* Dashboard Cards */}
      {cards.length > 0 ? (
        <Grid>
          {cards.map((card) => (
            <DashboardActivityCard
              key={card.id}
              config={card}
              combinedActivities={combinedActivities}
              profileActivities={profileActivities}
              canEdit={data.canEdit}
              dashboardId={data.dashboard.id}
              onSave={onRefresh}
            />
          ))}
        </Grid>
      ) : (
        <Card state="active">
          <CardHeader>
            <CardTitle>No Dashboard Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {data.canEdit
                ? 'Add cards to your dashboard to track combined activities.'
                : "The dashboard hasn't been set up yet. An editor can add cards."}
            </CardDescription>
            {data.canEdit && (
              <div className="mt-4">
                <CardConfigDialog dashboardId={data.dashboard.id} onSave={onRefresh} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Breakdown */}
      <ProfileBreakdown profileActivities={profileActivities} />
    </div>
  )
}
