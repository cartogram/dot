/**
 * GroupHeader Component
 *
 * Displays group name, members, and settings for group dashboard.
 */

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { GroupDashboardData } from '@/types/groups'
import { leaveGroup, regenerateInviteCode, deleteGroup } from '@/lib/server/groups'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/custom/Avatar/Avatar'
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

interface GroupHeaderProps {
  data: GroupDashboardData
  userId: string
}

export function GroupHeader({ data, userId }: GroupHeaderProps) {
  const { group, members, currentUserRole } = data
  const [showInviteCode, setShowInviteCode] = React.useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup({ data: { groupId: group.id, userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      navigate({ to: '/groups' })
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateInviteCode({ data: { groupId: group.id, userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-dashboard', group.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup({ data: { groupId: group.id, userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      navigate({ to: '/groups' })
    },
  })

  const copyInviteCode = () => {
    if (group.invite_code) {
      navigator.clipboard.writeText(group.invite_code)
    }
  }

  return (
    <Card state="active">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{group.name}</CardTitle>
            {group.description && (
              <CardDescription className="mt-1">{group.description}</CardDescription>
            )}
          </div>
          <Badge variant={isOwner ? 'primary' : 'secondary'}>
            {currentUserRole === 'owner' ? 'Owner' :
             currentUserRole === 'admin' ? 'Admin' : 'Member'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Members */}
          <div>
            <h4 className="text-sm font-medium mb-2">Members ({members.length})</h4>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const name = member.athlete
                  ? `${member.athlete.firstname || ''} ${member.athlete.lastname || ''}`.trim()
                  : member.profile.full_name || member.profile.email

                const initials = member.athlete
                  ? `${member.athlete.firstname?.[0] || ''}${member.athlete.lastname?.[0] || ''}`
                  : member.profile.full_name?.[0] || member.profile.email[0].toUpperCase()

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-full bg-muted px-3 py-1"
                  >
                    <Avatar>
                      {member.athlete?.profile ? (
                        <AvatarImage src={member.athlete.profile} alt={initials} />
                      ) : null}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{name}</span>
                    {member.role !== 'member' && (
                      <Badge variant="secondary" className="text-xs">
                        {member.role}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Invite Code (visible to admins/owners) */}
          {isOwnerOrAdmin && (
            <div>
              <h4 className="text-sm font-medium mb-2">Invite Code</h4>
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-3 py-1 font-mono text-lg tracking-wider">
                  {showInviteCode ? group.invite_code : '********'}
                </code>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowInviteCode(!showInviteCode)}
                >
                  {showInviteCode ? 'Hide' : 'Show'}
                </Button>
                {showInviteCode && (
                  <>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={copyInviteCode}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => regenerateMutation.mutate()}
                      disabled={regenerateMutation.isPending}
                    >
                      {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button to="/groups" variant="secondary">
          Back to Groups
        </Button>
        {!isOwner && (
          <Button
            variant="secondary"
            destructive
            onClick={() => setShowLeaveConfirm(true)}
          >
            Leave Group
          </Button>
        )}
        {isOwner && (
          <Button
            variant="secondary"
            destructive
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Group
          </Button>
        )}

      </CardFooter>

      {/* Leave Confirmation Dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Group?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave "{group.name}"? You'll need a new invite code to rejoin.
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
              {leaveMutation.isPending ? 'Leaving...' : 'Leave Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot be undone
              and all members will be removed.
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
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
