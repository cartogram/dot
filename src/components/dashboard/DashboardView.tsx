/**
 * DashboardView Component
 *
 * Main dashboard view, showing combined activity stats from all attached profiles.
 */

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { DashboardHeader } from './DashboardHeader'
import { DashboardActivityCard } from './DashboardActivityCard'
import { ProfileBreakdown } from './ProfileBreakdown'
import { CardConfigDialog } from './CardConfigDialog'
import type { DashboardData } from '@/types/dashboards'
import { createInvite } from '@/lib/server/dashboards'
import { Input } from '@/components/custom/Input/Input'
import { Button } from '@/components/custom/Button/Button'
import { Label } from '@/components/custom/Label/Label'
import { Grid } from '@/components/custom/Grid/Grid'
import { Stack } from '@/components/custom/Stack/Stack'
import { Row } from '@/components/custom/Row/Row'
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
    <Stack gap="large">
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
        <Row justify="center">
          <CardConfigDialog dashboardId={data.dashboard.id} onSave={onRefresh} />
        </Row>
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
              <Stack gap="medium" style={{ marginTop: '1rem' }}>
                <CardConfigDialog dashboardId={data.dashboard.id} onSave={onRefresh} />
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Breakdown */}
      <ProfileBreakdown profileActivities={profileActivities} />

      {/* Invite Athletes Card */}
      {data.canEdit && <InviteAthletesCard dashboardId={data.dashboard.id} userId={userId} />}
    </Stack>
  )
}

interface InviteAthletesCardProps {
  dashboardId: string
  userId: string
}

function InviteAthletesCard({ dashboardId, userId }: InviteAthletesCardProps) {
  const [inviteCode, setInviteCode] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const hasRequested = React.useRef(false)

  const inviteMutation = useMutation({
    mutationFn: () =>
      createInvite({
        data: { dashboardId, userId, role: 'viewer' },
      }),
    onSuccess: (result) => {
      setInviteCode(result.code)
    },
  })

  React.useEffect(() => {
    if (!hasRequested.current) {
      hasRequested.current = true
      inviteMutation.mutate()
    }
  }, [dashboardId, userId])

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite athletes</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>
          Share this invite code with other athletes to let them join this dashboard.
        </CardDescription>
        <Stack gap="small">
          <Label htmlFor="invite-code">Invite Code</Label>
          <Row gap="small">
            <Input
              id="invite-code"
              readOnly
              placeholder={inviteMutation.isPending ? 'Generating...' : 'ABCD1234'}
              value={inviteCode || ''}
              maxLength={8}
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontFamily: 'ui-monospace, monospace',
                textAlign: 'center',
              }}
            />
            <Button
              variant="secondary"
              onClick={copyInviteCode}
              disabled={!inviteCode}
              style={{ flexShrink: 0 }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </Row>
        </Stack>
      </CardContent>
    </Card>
  )
}
