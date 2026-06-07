/**
 * DashboardHeader Component
 *
 * Displays dashboard name, profiles, and settings.
 */

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { DashboardSettingsSheet } from './DashboardSettingsSheet'
import type { DashboardData } from '@/types/dashboards'
import { deleteDashboard, leaveDashboard } from '@/lib/server/dashboards'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/custom/Avatar/Avatar'
import { Badge } from '@/components/custom/Badge/Badge'
import { Button } from '@/components/custom/Button/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/custom/Dialog/Dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/custom/Card'
import { Stack } from '@/components/custom/Stack/Stack'
import { Row } from '@/components/custom/Row/Row'

import './dashboard-header.css'

interface DashboardHeaderProps {
  data: DashboardData
  userId: string
  onRefresh?: () => void
  stats?: {
    profileCount: number
    profilesWithData: number
    totalActivities: number
    cardCount: number
  }
}

export function DashboardHeader({ data, userId, onRefresh, stats }: DashboardHeaderProps) {
  const { dashboard, profiles, currentUserRole, canEdit } = data
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [showSettingsSheet, setShowSettingsSheet] = React.useState(false)
  const navigate = useNavigate()
  const router = useRouter()

  const isOwner = currentUserRole === 'owner'

  const leaveMutation = useMutation({
    mutationFn: () => leaveDashboard({ data: { dashboardId: dashboard.id, userId } }),
    onSuccess: () => {
      // Invalidate router cache to refetch dashboards list on next visit
      router.invalidate()
      navigate({ to: '/dashboards' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteDashboard({ data: { dashboardId: dashboard.id, userId } }),
    onSuccess: () => {
      // Invalidate router cache to refetch dashboards list on next visit
      router.invalidate()
      navigate({ to: '/dashboards' })
    },
  })

  const roleLabel =
    currentUserRole === 'owner' ? 'Owner' : currentUserRole === 'editor' ? 'Editor' : 'Viewer'

  return (
    <Card state="active">
      <CardHeader>
        <div className="DashboardHeader__TopRow">
          <CardTitle>{dashboard.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {dashboard.description && <CardDescription>{dashboard.description}</CardDescription>}
        <Stack gap="medium">
          <Row gap="small" wrap>
            {dashboard.isPublic && <Badge variant="secondary">Public</Badge>}
            {dashboard.isDefault && <Badge variant="secondary">Default</Badge>}
            <Badge variant={isOwner ? 'primary' : 'secondary'}>{roleLabel}</Badge>
          </Row>
          {/* Profiles */}
          <div className="DashboardHeader__Section">
            <h4 className="DashboardHeader__SectionLabel">Profiles ({profiles.length})</h4>
            <Row gap="small" wrap>
              {profiles.map((profile) => {
                const name = profile.athlete
                  ? `${profile.athlete.firstname || ''} ${profile.athlete.lastname || ''}`.trim()
                  : profile.profile.fullName || profile.profile.email

                const initials = profile.athlete
                  ? `${profile.athlete.firstname?.[0] || ''}${profile.athlete.lastname?.[0] || ''}`
                  : profile.profile.fullName?.[0] || profile.profile.email[0].toUpperCase()

                return (
                  <div key={profile.id} className="DashboardHeader__Profile">
                    <Avatar>
                      {profile.athlete?.profile ? (
                        <AvatarImage src={profile.athlete.profile} alt={initials} />
                      ) : null}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="DashboardHeader__ProfileName">{name}</span>
                  </div>
                )
              })}
            </Row>
          </div>

          {/* Public URL */}
          {dashboard.isPublic && dashboard.slug && (
            <div className="DashboardHeader__Section">
              <h4 className="DashboardHeader__SectionLabel">Public URL</h4>
              <code className="DashboardHeader__UrlCode">
                {import.meta.env.VITE_APP_URL}/d/{dashboard.slug}
              </code>
            </div>
          )}
        </Stack>
      </CardContent>
      <CardFooter>
        {isOwner && (
          <Button variant="secondary" onClick={() => setShowSettingsSheet(true)}>
            Settings
          </Button>
        )}
        {!isOwner && currentUserRole && (
          <Button variant="secondary" destructive onClick={() => setShowLeaveConfirm(true)}>
            Leave
          </Button>
        )}
      </CardFooter>

      {/* Leave Confirmation Dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Dashboard?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave "{dashboard.name}"? You'll need a new invite code to
              rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowLeaveConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              destructive
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
            >
              {leaveMutation.isPending ? 'Leaving...' : 'Leave Dashboard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dashboard?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{dashboard.name}"? This action cannot be undone and
              all profiles will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              destructive
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Dashboard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Sheet */}
      <DashboardSettingsSheet
        dashboard={dashboard}
        userId={userId}
        stats={stats}
        open={showSettingsSheet}
        onOpenChange={setShowSettingsSheet}
        onRefresh={onRefresh}
        onDeleteClick={() => setShowDeleteConfirm(true)}
      />
    </Card>
  )
}
