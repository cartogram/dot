/**
 * Server functions for dashboard CRUD operations
 *
 * These functions use Prisma for database operations
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import type {
  Dashboard,
  DashboardInvite,
  DashboardWithProfiles,
  DashboardProfileWithUser,
  InviteLinkData,
} from '@/types/dashboards'

// =====================================================
// HELPER: Generate slug from name
// =====================================================

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
  const random = Math.random().toString(36).substring(2, 8)
  return `${base}-${random}`
}

// =====================================================
// HELPER: Generate invite code
// =====================================================

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// =====================================================
// HELPER: Build profile with user info
// =====================================================

async function buildProfilesWithUser(
  profileIds: string[]
): Promise<Map<string, { profile: any; athlete: any }>> {
  const users = await prisma.user.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, fullName: true, email: true },
  })

  const dataSources = await prisma.dataSource.findMany({
    where: {
      userId: { in: profileIds },
      provider: 'strava',
      isActive: true,
    },
    select: { userId: true, athleteData: true },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))
  const athleteMap = new Map(
    dataSources.map((ds) => [ds.userId, ds.athleteData])
  )

  const result = new Map<string, { profile: any; athlete: any }>()
  for (const id of profileIds) {
    const user = userMap.get(id)
    const athleteData = athleteMap.get(id) as any
    result.set(id, {
      profile: {
        id,
        fullName: user?.fullName || null,
        email: user?.email || '',
      },
      athlete: athleteData
        ? {
            id: athleteData.id,
            firstname: athleteData.firstname,
            lastname: athleteData.lastname,
            profile: athleteData.profile,
          }
        : null,
    })
  }

  return result
}

// =====================================================
// SCHEMAS
// =====================================================

const CreateDashboardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  userId: z.string().uuid(),
  isPublic: z.boolean().optional().default(false),
  isDefault: z.boolean().optional().default(false),
})

const JoinDashboardSchema = z.object({
  inviteCode: z.string().min(1),
  userId: z.string().uuid(),
})

const LeaveDashboardSchema = z.object({
  dashboardId: z.string().uuid(),
  userId: z.string().uuid(),
})

const GetDashboardSchema = z.object({
  dashboardId: z.string().uuid(),
  userId: z.string().uuid().optional(),
})

const GetDashboardBySlugSchema = z.object({
  slug: z.string().min(1),
  userId: z.string().uuid().optional(),
})

const GetUserDashboardsSchema = z.object({
  userId: z.string().uuid(),
})

const UpdateDashboardSchema = z.object({
  dashboardId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  slug: z.string().min(1).max(60).optional().nullable(),
})

const CreateInviteSchema = z.object({
  dashboardId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['editor', 'viewer']).optional().default('viewer'),
  expiresInDays: z.number().min(1).max(365).optional(),
})

const DeleteInviteSchema = z.object({
  inviteId: z.string().uuid(),
  userId: z.string().uuid(),
})

const DeleteDashboardSchema = z.object({
  dashboardId: z.string().uuid(),
  userId: z.string().uuid(),
})

const RemoveProfileSchema = z.object({
  dashboardId: z.string().uuid(),
  profileId: z.string().uuid(),
  userId: z.string().uuid(),
})

const UpdateProfileRoleSchema = z.object({
  dashboardId: z.string().uuid(),
  profileId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['editor', 'viewer']),
})

// =====================================================
// CREATE DASHBOARD
// =====================================================

export const createDashboard = createServerFn({ method: 'POST' })
  .inputValidator(CreateDashboardSchema)
  .handler(async ({ data }): Promise<Dashboard> => {
    const slug = generateSlug(data.name)

    const dashboard = await prisma.dashboard.create({
      data: {
        name: data.name,
        description: data.description || null,
        ownerId: data.userId,
        isPublic: data.isPublic,
        isDefault: data.isDefault,
        slug,
        profiles: {
          create: {
            profileId: data.userId,
            role: 'owner',
            inviteAccepted: true,
          },
        },
      },
    })

    return dashboard as Dashboard
  })

// =====================================================
// JOIN DASHBOARD (by invite code)
// =====================================================

export const joinDashboard = createServerFn({ method: 'POST' })
  .inputValidator(JoinDashboardSchema)
  .handler(async ({ data }): Promise<Dashboard> => {
    // Find the invite by code
    const invite = await prisma.dashboardInvite.findUnique({
      where: { inviteCode: data.inviteCode.toUpperCase() },
      include: { dashboard: true },
    })

    if (!invite) {
      throw new Error('Invalid invite code')
    }

    // Check if invite has expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new Error('This invite has expired')
    }

    // Check if already a member
    const existingProfile = await prisma.dashboardProfile.findUnique({
      where: {
        dashboardId_profileId: {
          dashboardId: invite.dashboardId,
          profileId: data.userId,
        },
      },
    })

    if (existingProfile) {
      throw new Error('You are already a member of this dashboard')
    }

    // Add user as profile with the invite's role
    await prisma.dashboardProfile.create({
      data: {
        dashboardId: invite.dashboardId,
        profileId: data.userId,
        role: invite.role,
        inviteAccepted: true,
      },
    })

    return invite.dashboard as Dashboard
  })

// =====================================================
// LEAVE DASHBOARD
// =====================================================

export const leaveDashboard = createServerFn({ method: 'POST' })
  .inputValidator(LeaveDashboardSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    // Check if user is the owner
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: data.dashboardId },
      select: { ownerId: true },
    })

    if (dashboard?.ownerId === data.userId) {
      throw new Error(
        'Dashboard owners cannot leave. Transfer ownership or delete the dashboard.'
      )
    }

    // Remove user from dashboard
    await prisma.dashboardProfile.delete({
      where: {
        dashboardId_profileId: {
          dashboardId: data.dashboardId,
          profileId: data.userId,
        },
      },
    })

    return { success: true }
  })

// =====================================================
// GET USER'S DASHBOARDS
// =====================================================

export const getUserDashboards = createServerFn({ method: 'GET' })
  .inputValidator(GetUserDashboardsSchema)
  .handler(async ({ data }): Promise<DashboardWithProfiles[]> => {
    // Get all dashboards the user is a member of
    const memberships = await prisma.dashboardProfile.findMany({
      where: { profileId: data.userId },
      select: { dashboardId: true, role: true },
    })

    if (memberships.length === 0) {
      return []
    }

    const dashboardIds = memberships.map((m) => m.dashboardId)

    // Get dashboard details
    const dashboards = await prisma.dashboard.findMany({
      where: { id: { in: dashboardIds } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    // Get all profiles for all dashboards
    const allProfiles = await prisma.dashboardProfile.findMany({
      where: { dashboardId: { in: dashboardIds } },
    })

    // Get user info for all profiles
    const profileUserIds = [...new Set(allProfiles.map((p) => p.profileId))]
    const userMap = await buildProfilesWithUser(profileUserIds)

    // Build DashboardWithProfiles for each dashboard
    return dashboards.map((dashboard) => {
      const dashboardProfiles = allProfiles
        .filter((p) => p.dashboardId === dashboard.id)
        .map((p): DashboardProfileWithUser => {
          const userData = userMap.get(p.profileId)
          return {
            ...p,
            profile: userData?.profile || {
              id: p.profileId,
              fullName: null,
              email: '',
            },
            athlete: userData?.athlete || null,
          }
        })

      const userMembership = memberships.find(
        (m) => m.dashboardId === dashboard.id
      )

      return {
        ...dashboard,
        profiles: dashboardProfiles,
        profileCount: dashboardProfiles.length,
        currentUserRole: userMembership?.role || 'viewer',
      }
    })
  })

// =====================================================
// GET SINGLE DASHBOARD
// =====================================================

export const getDashboard = createServerFn({ method: 'GET' })
  .inputValidator(GetDashboardSchema)
  .handler(async ({ data }): Promise<DashboardWithProfiles> => {
    // Get dashboard details
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: data.dashboardId },
    })

    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    // Check access: either public or user is a member
    let userRole: string | null = null
    if (data.userId) {
      const membership = await prisma.dashboardProfile.findUnique({
        where: {
          dashboardId_profileId: {
            dashboardId: data.dashboardId,
            profileId: data.userId,
          },
        },
        select: { role: true },
      })

      userRole = membership?.role || null
    }

    if (!dashboard.isPublic && !userRole) {
      throw new Error('You do not have access to this dashboard')
    }

    // Get all profiles
    const profiles = await prisma.dashboardProfile.findMany({
      where: { dashboardId: data.dashboardId },
    })

    // Get user info for all profiles
    const profileUserIds = profiles.map((p) => p.profileId)
    const userMap = await buildProfilesWithUser(profileUserIds)

    const dashboardProfiles = profiles.map((p): DashboardProfileWithUser => {
      const userData = userMap.get(p.profileId)
      return {
        ...p,
        profile: userData?.profile || {
          id: p.profileId,
          fullName: null,
          email: '',
        },
        athlete: userData?.athlete || null,
      }
    })

    return {
      ...dashboard,
      profiles: dashboardProfiles,
      profileCount: dashboardProfiles.length,
      currentUserRole: (userRole as any) || 'viewer',
    }
  })

// =====================================================
// GET DASHBOARD BY SLUG (for public access)
// =====================================================

export const getDashboardBySlug = createServerFn({ method: 'GET' })
  .inputValidator(GetDashboardBySlugSchema)
  .handler(async ({ data }): Promise<DashboardWithProfiles> => {
    // Get dashboard by slug
    const dashboard = await prisma.dashboard.findUnique({
      where: { slug: data.slug },
    })

    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    // Check access
    let userRole: string | null = null
    if (data.userId) {
      const membership = await prisma.dashboardProfile.findUnique({
        where: {
          dashboardId_profileId: {
            dashboardId: dashboard.id,
            profileId: data.userId,
          },
        },
        select: { role: true },
      })

      userRole = membership?.role || null
    }

    if (!dashboard.isPublic && !userRole) {
      throw new Error('This dashboard is private')
    }

    // Get all profiles
    const profiles = await prisma.dashboardProfile.findMany({
      where: { dashboardId: dashboard.id },
    })

    // Get user info for all profiles
    const profileUserIds = profiles.map((p) => p.profileId)
    const userMap = await buildProfilesWithUser(profileUserIds)

    const dashboardProfiles = profiles.map((p): DashboardProfileWithUser => {
      const userData = userMap.get(p.profileId)
      return {
        ...p,
        profile: userData?.profile || {
          id: p.profileId,
          fullName: null,
          email: '',
        },
        athlete: userData?.athlete || null,
      }
    })

    return {
      ...dashboard,
      profiles: dashboardProfiles,
      profileCount: dashboardProfiles.length,
      currentUserRole: (userRole as any) || 'viewer',
    }
  })

// =====================================================
// UPDATE DASHBOARD
// =====================================================

export const updateDashboard = createServerFn({ method: 'POST' })
  .inputValidator(UpdateDashboardSchema)
  .handler(async ({ data }): Promise<Dashboard> => {
    // Verify user is owner
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: data.dashboardId },
      select: { ownerId: true },
    })

    if (!dashboard || dashboard.ownerId !== data.userId) {
      throw new Error('Only the dashboard owner can update the dashboard')
    }

    // If setting this dashboard as default, unset other defaults for this user
    if (data.isDefault === true) {
      await prisma.dashboard.updateMany({
        where: {
          ownerId: data.userId,
          id: { not: data.dashboardId },
        },
        data: { isDefault: false },
      })
    }

    const updates: Record<string, any> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (data.isPublic !== undefined) updates.isPublic = data.isPublic
    if (data.isDefault !== undefined) updates.isDefault = data.isDefault
    if (data.slug !== undefined) updates.slug = data.slug

    const updatedDashboard = await prisma.dashboard.update({
      where: { id: data.dashboardId },
      data: updates,
    })

    return updatedDashboard as Dashboard
  })

// =====================================================
// CREATE INVITE
// =====================================================

export const createInvite = createServerFn({ method: 'POST' })
  .inputValidator(CreateInviteSchema)
  .handler(async ({ data }): Promise<InviteLinkData> => {
    // Verify user can edit dashboard
    const membership = await prisma.dashboardProfile.findUnique({
      where: {
        dashboardId_profileId: {
          dashboardId: data.dashboardId,
          profileId: data.userId,
        },
      },
      select: { role: true },
    })

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      throw new Error('Only owners and editors can create invites')
    }

    const inviteCode = generateInviteCode()

    // Calculate expiration
    let expiresAt: Date | null = null
    if (data.expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays)
    }

    // Get dashboard name for response
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: data.dashboardId },
      select: { name: true },
    })

    // Create invite
    const invite = await prisma.dashboardInvite.create({
      data: {
        dashboardId: data.dashboardId,
        inviteCode,
        role: data.role,
        expiresAt,
      },
    })

    return {
      code: invite.inviteCode,
      role: invite.role,
      expiresAt: invite.expiresAt,
      dashboardName: dashboard?.name || '',
      dashboardId: data.dashboardId,
    }
  })

// =====================================================
// GET DASHBOARD INVITES
// =====================================================

export const getDashboardInvites = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      dashboardId: z.string().uuid(),
      userId: z.string().uuid(),
    })
  )
  .handler(async ({ data }): Promise<DashboardInvite[]> => {
    // Verify user can edit dashboard
    const membership = await prisma.dashboardProfile.findUnique({
      where: {
        dashboardId_profileId: {
          dashboardId: data.dashboardId,
          profileId: data.userId,
        },
      },
      select: { role: true },
    })

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      throw new Error('Only owners and editors can view invites')
    }

    const invites = await prisma.dashboardInvite.findMany({
      where: { dashboardId: data.dashboardId },
      orderBy: { createdAt: 'desc' },
    })

    return invites as DashboardInvite[]
  })

// =====================================================
// DELETE INVITE
// =====================================================

export const deleteInvite = createServerFn({ method: 'POST' })
  .inputValidator(DeleteInviteSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    // Get the invite to find the dashboard
    const invite = await prisma.dashboardInvite.findUnique({
      where: { id: data.inviteId },
      select: { dashboardId: true },
    })

    if (!invite) {
      throw new Error('Invite not found')
    }

    // Verify user is owner
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: invite.dashboardId },
      select: { ownerId: true },
    })

    if (!dashboard || dashboard.ownerId !== data.userId) {
      throw new Error('Only the dashboard owner can delete invites')
    }

    await prisma.dashboardInvite.delete({
      where: { id: data.inviteId },
    })

    return { success: true }
  })

// =====================================================
// DELETE DASHBOARD
// =====================================================

export const deleteDashboard = createServerFn({ method: 'POST' })
  .inputValidator(DeleteDashboardSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    // Verify user is owner
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: data.dashboardId },
      select: { ownerId: true },
    })

    if (!dashboard || dashboard.ownerId !== data.userId) {
      throw new Error('Only the dashboard owner can delete the dashboard')
    }

    // Delete the dashboard (cascade will handle profiles, invites)
    await prisma.dashboard.delete({
      where: { id: data.dashboardId },
    })

    return { success: true }
  })

// =====================================================
// REMOVE PROFILE FROM DASHBOARD
// =====================================================

export const removeProfile = createServerFn({ method: 'POST' })
  .inputValidator(RemoveProfileSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    // Verify user is owner
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: data.dashboardId },
      select: { ownerId: true },
    })

    if (!dashboard || dashboard.ownerId !== data.userId) {
      throw new Error('Only the dashboard owner can remove profiles')
    }

    // Prevent removing the owner
    if (data.profileId === dashboard.ownerId) {
      throw new Error('Cannot remove the dashboard owner')
    }

    await prisma.dashboardProfile.delete({
      where: {
        dashboardId_profileId: {
          dashboardId: data.dashboardId,
          profileId: data.profileId,
        },
      },
    })

    return { success: true }
  })

// =====================================================
// UPDATE PROFILE ROLE
// =====================================================

export const updateProfileRole = createServerFn({ method: 'POST' })
  .inputValidator(UpdateProfileRoleSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    // Verify user is owner
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: data.dashboardId },
      select: { ownerId: true },
    })

    if (!dashboard || dashboard.ownerId !== data.userId) {
      throw new Error('Only the dashboard owner can change roles')
    }

    // Prevent changing owner's role
    if (data.profileId === dashboard.ownerId) {
      throw new Error("Cannot change the owner's role")
    }

    await prisma.dashboardProfile.update({
      where: {
        dashboardId_profileId: {
          dashboardId: data.dashboardId,
          profileId: data.profileId,
        },
      },
      data: { role: data.role },
    })

    return { success: true }
  })

// =====================================================
// GET USER'S DEFAULT DASHBOARD
// =====================================================

export const getDefaultDashboard = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }): Promise<Dashboard | null> => {
    // First try to find a default dashboard
    const defaultDashboard = await prisma.dashboard.findFirst({
      where: {
        ownerId: data.userId,
        isDefault: true,
      },
    })

    if (defaultDashboard) {
      return defaultDashboard as Dashboard
    }

    // If no default, get first dashboard user is a member of
    const membership = await prisma.dashboardProfile.findFirst({
      where: { profileId: data.userId },
      orderBy: { joinedAt: 'asc' },
      select: { dashboardId: true },
    })

    if (membership) {
      const dashboard = await prisma.dashboard.findUnique({
        where: { id: membership.dashboardId },
      })

      return dashboard as Dashboard | null
    }

    return null
  })
