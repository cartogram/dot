/**
 * DashboardHeader Component
 *
 * Displays dashboard name, profiles, and settings.
 */

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import type { DashboardData } from '@/types/dashboards'
import {
  leaveDashboard,
  deleteDashboard,
  createInvite,
} from '@/lib/server/dashboards'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/custom/Avatar/Avatar'
import { Badge } from '@/components/custom/Badge/Badge'
import { Button } from '@/components/custom/Button/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/custom/Dialog/Dialog'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/custom/Card'
import { DashboardSettingsSheet } from './DashboardSettingsSheet'

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
  const [showInviteDialog, setShowInviteDialog] = React.useState(false)
  const [inviteCode, setInviteCode] = React.useState<string | null>(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [showSettingsSheet, setShowSettingsSheet] = React.useState(false)
  const navigate = useNavigate()
  const router = useRouter()

  const isOwner = currentUserRole === 'owner'

  const leaveMutation = useMutation({
    mutationFn: () =>
      leaveDashboard({ data: { dashboardId: dashboard.id, userId } }),
    onSuccess: () => {
      // Invalidate router cache to refetch dashboards list on next visit
      router.invalidate()
      navigate({ to: '/dashboards' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteDashboard({ data: { dashboardId: dashboard.id, userId } }),
    onSuccess: () => {
      // Invalidate router cache to refetch dashboards list on next visit
      router.invalidate()
      navigate({ to: '/dashboards' })
    },
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      createInvite({
        data: { dashboardId: dashboard.id, userId, role: 'viewer' },
      }),
    onSuccess: (result) => {
      setInviteCode(result.code)
    },
  })

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
    }
  }

  const handleCreateInvite = () => {
    setShowInviteDialog(true)
    inviteMutation.mutate()
  }

  const roleLabel =
    currentUserRole === 'owner'
      ? 'Owner'
      : currentUserRole === 'editor'
        ? 'Editor'
        : 'Viewer'

  return (
    <Card state="active">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{dashboard.name}</CardTitle>
           
          </div>
          <div className="flex gap-2">
            
          </div>
        </div>
      </CardHeader>
      <CardContent>
      {dashboard.description && (
              <CardDescription className="mt-1">
                {dashboard.description}
              </CardDescription>
            )}
        <div className="space-y-4">
          <div className="flex gap-2">
          {dashboard.isPublic && (
              <Badge variant="secondary">Public</Badge>
            )}
            {dashboard.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
            <Badge variant={isOwner ? 'primary' : 'secondary'}>
              {roleLabel}
            </Badge>
          </div>
          {/* Profiles */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Profiles ({profiles.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {profiles.map((profile) => {
                const name = profile.athlete
                  ? `${profile.athlete.firstname || ''} ${profile.athlete.lastname || ''}`.trim()
                  : profile.profile.fullName || profile.profile.email

                const initials = profile.athlete
                  ? `${profile.athlete.firstname?.[0] || ''}${profile.athlete.lastname?.[0] || ''}`
                  : profile.profile.fullName?.[0] ||
                    profile.profile.email[0].toUpperCase()

                return (
                  <div
                    key={profile.id}
                    className="flex items-center gap-2"
                  >
                    <Avatar>
                      {profile.athlete?.profile ? (
                        <AvatarImage
                          src={profile.athlete.profile}
                          alt={initials}
                        />
                      ) : null}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{name}</span>

                  </div>
                )
              })}
            </div>
          </div>

          {/* Public URL */}
          {dashboard.isPublic && dashboard.slug && (
            <div>
              <h4 className="text-sm font-medium mb-2">Public URL</h4>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {window.location.origin}/d/{dashboard.slug}
              </code>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isOwner && (
          <Button variant="secondary" onClick={() => setShowSettingsSheet(true)}>
            Settings
          </Button>
        )}
        {canEdit && (
          <Button variant="secondary" onClick={handleCreateInvite}>
            Invite
          </Button>
        )}
        {!isOwner && currentUserRole && (
          <Button
            variant="secondary"
            destructive
            onClick={() => setShowLeaveConfirm(true)}
          >
            Leave
          </Button>
        )}
      </CardFooter>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Dashboard</DialogTitle>
            <DialogDescription>
              Share this invite code with others to let them join your
              dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {inviteMutation.isPending ? (
              <p>Generating invite code...</p>
            ) : inviteCode ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-lg tracking-wider text-center">
                  {inviteCode}
                </code>
                <Button variant="secondary" onClick={copyInviteCode}>
                  Copy
                </Button>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowInviteDialog(false)
                setInviteCode(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Dashboard?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave "{dashboard.name}"? You'll need a
              new invite code to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowLeaveConfirm(false)}
            >
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
              Are you sure you want to delete "{dashboard.name}"? This action
              cannot be undone and all profiles will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
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
