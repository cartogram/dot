/**
 * Server functions for dashboard CRUD operations
 *
 * These functions use the service role key to bypass RLS
 * where necessary (e.g., when looking up dashboards by invite code)
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { Dashboard, DashboardInvite } from '@/lib/supabase/types'
import type {
  DashboardWithProfiles,
  DashboardProfileWithUser,
  InviteLinkData,
} from '@/types/dashboards'

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
  userId: z.string().uuid().optional(), // Optional for public dashboards
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
// HELPER: Build profile with user info
// =====================================================

async function buildProfilesWithUser(
  supabase: any,
  profileIds: string[]
): Promise<Map<string, { profile: any; athlete: any }>> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', profileIds)

  const { data: dataSources } = await supabase
    .from('data_sources')
    .select('user_id, athlete_data')
    .eq('provider', 'strava')
    .eq('is_active', true)
    .in('user_id', profileIds)

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
  const athleteMap = new Map(
    (dataSources || []).map((ds: any) => [ds.user_id, ds.athlete_data])
  )

  const result = new Map<string, { profile: any; athlete: any }>()
  for (const id of profileIds) {
    const profile = profileMap.get(id)
    const athleteData = athleteMap.get(id)
    result.set(id, {
      profile: {
        id,
        full_name: profile?.full_name || null,
        email: profile?.email || '',
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
// CREATE DASHBOARD
// =====================================================

export const createDashboard = createServerFn({ method: 'POST' })
  .inputValidator(CreateDashboardSchema)
  .handler(async ({ data }): Promise<Dashboard> => {
    const supabase = createServerClient() as any

    // Generate a slug from the name
    const { data: slug } = await supabase.rpc('generate_dashboard_slug', {
      dashboard_name: data.name,
    })

    const { data: dashboard, error } = await supabase
      .from('dashboards')
      .insert({
        name: data.name,
        description: data.description || null,
        owner_id: data.userId,
        is_public: data.isPublic,
        is_default: data.isDefault,
        slug: slug,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating dashboard:', error)
      throw new Error('Failed to create dashboard')
    }

    return dashboard as Dashboard
  })

// =====================================================
// JOIN DASHBOARD (by invite code)
// =====================================================

export const joinDashboard = createServerFn({ method: 'POST' })
  .inputValidator(JoinDashboardSchema)
  .handler(async ({ data }): Promise<Dashboard> => {
    const supabase = createServerClient() as any

    // Find the invite by code
    const { data: invite, error: inviteError } = await supabase
      .from('dashboard_invites')
      .select('*, dashboards(*)')
      .eq('invite_code', data.inviteCode.toUpperCase())
      .single()

    if (inviteError || !invite) {
      throw new Error('Invalid invite code')
    }

    // Check if invite has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new Error('This invite has expired')
    }

    // Check if already a member
    const { data: existingProfile } = await supabase
      .from('dashboard_profiles')
      .select('id')
      .eq('dashboard_id', invite.dashboard_id)
      .eq('profile_id', data.userId)
      .maybeSingle()

    if (existingProfile) {
      throw new Error('You are already a member of this dashboard')
    }

    // Add user as profile with the invite's role
    const { error: profileError } = await supabase
      .from('dashboard_profiles')
      .insert({
        dashboard_id: invite.dashboard_id,
        profile_id: data.userId,
        role: invite.role,
        invite_accepted: true,
      })

    if (profileError) {
      console.error('Error joining dashboard:', profileError)
      throw new Error('Failed to join dashboard')
    }

    return invite.dashboards as Dashboard
  })

// =====================================================
// LEAVE DASHBOARD
// =====================================================

export const leaveDashboard = createServerFn({ method: 'POST' })
  .inputValidator(LeaveDashboardSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = createServerClient() as any

    // Check if user is the owner
    const { data: dashboard } = await supabase
      .from('dashboards')
      .select('owner_id')
      .eq('id', data.dashboardId)
      .single()

    if (dashboard?.owner_id === data.userId) {
      throw new Error(
        'Dashboard owners cannot leave. Transfer ownership or delete the dashboard.'
      )
    }

    // Remove user from dashboard
    const { error } = await supabase
      .from('dashboard_profiles')
      .delete()
      .eq('dashboard_id', data.dashboardId)
      .eq('profile_id', data.userId)

    if (error) {
      console.error('Error leaving dashboard:', error)
      throw new Error('Failed to leave dashboard')
    }

    return { success: true }
  })

// =====================================================
// GET USER'S DASHBOARDS
// =====================================================

export const getUserDashboards = createServerFn({ method: 'GET' })
  .inputValidator(GetUserDashboardsSchema)
  .handler(async ({ data }): Promise<DashboardWithProfiles[]> => {
    const supabase = createServerClient() as any

    // Get all dashboards the user is a member of
    const { data: memberships, error: membershipError } = await supabase
      .from('dashboard_profiles')
      .select('dashboard_id, role')
      .eq('profile_id', data.userId)

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError)
      throw new Error('Failed to fetch dashboards')
    }

    if (!memberships || memberships.length === 0) {
      return []
    }

    const dashboardIds = memberships.map((m: any) => m.dashboard_id)

    // Get dashboard details
    const { data: dashboards, error: dashboardsError } = await supabase
      .from('dashboards')
      .select('*')
      .in('id', dashboardIds)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (dashboardsError || !dashboards) {
      console.error('Error fetching dashboards:', dashboardsError)
      throw new Error('Failed to fetch dashboards')
    }

    // Get all profiles for all dashboards
    const { data: allProfiles, error: profilesError } = await supabase
      .from('dashboard_profiles')
      .select('*')
      .in('dashboard_id', dashboardIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    }

    // Get user info for all profiles
    const profileUserIds = [
      ...new Set((allProfiles || []).map((p: any) => p.profile_id)),
    ]
    const userMap = await buildProfilesWithUser(supabase, profileUserIds)

    // Build DashboardWithProfiles for each dashboard
    return dashboards.map((dashboard: any) => {
      const dashboardProfiles = (allProfiles || [])
        .filter((p: any) => p.dashboard_id === dashboard.id)
        .map((p: any): DashboardProfileWithUser => {
          const userData = userMap.get(p.profile_id)
          return {
            ...p,
            profile: userData?.profile || {
              id: p.profile_id,
              full_name: null,
              email: '',
            },
            athlete: userData?.athlete || null,
          }
        })

      const userMembership = memberships.find(
        (m: any) => m.dashboard_id === dashboard.id
      )

      return {
        ...dashboard,
        profiles: dashboardProfiles,
        profile_count: dashboardProfiles.length,
        current_user_role: userMembership?.role || 'viewer',
      }
    })
  })

// =====================================================
// GET SINGLE DASHBOARD
// =====================================================

export const getDashboard = createServerFn({ method: 'GET' })
  .inputValidator(GetDashboardSchema)
  .handler(async ({ data }): Promise<DashboardWithProfiles> => {
    const supabase = createServerClient() as any

    // Get dashboard details
    const { data: dashboard, error: dashboardError } = await supabase
      .from('dashboards')
      .select('*')
      .eq('id', data.dashboardId)
      .single()

    if (dashboardError || !dashboard) {
      throw new Error('Dashboard not found')
    }

    // Check access: either public or user is a member
    let userRole: string | null = null
    if (data.userId) {
      const { data: membership } = await supabase
        .from('dashboard_profiles')
        .select('role')
        .eq('dashboard_id', data.dashboardId)
        .eq('profile_id', data.userId)
        .single()

      userRole = membership?.role || null
    }

    if (!dashboard.is_public && !userRole) {
      throw new Error('You do not have access to this dashboard')
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('dashboard_profiles')
      .select('*')
      .eq('dashboard_id', data.dashboardId)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    }

    // Get user info for all profiles
    const profileUserIds = (profiles || []).map((p: any) => p.profile_id)
    const userMap = await buildProfilesWithUser(supabase, profileUserIds)

    const dashboardProfiles = (profiles || []).map(
      (p: any): DashboardProfileWithUser => {
        const userData = userMap.get(p.profile_id)
        return {
          ...p,
          profile: userData?.profile || {
            id: p.profile_id,
            full_name: null,
            email: '',
          },
          athlete: userData?.athlete || null,
        }
      }
    )

    return {
      ...dashboard,
      profiles: dashboardProfiles,
      profile_count: dashboardProfiles.length,
      current_user_role: userRole || 'viewer',
    }
  })

// =====================================================
// GET DASHBOARD BY SLUG (for public access)
// =====================================================

export const getDashboardBySlug = createServerFn({ method: 'GET' })
  .inputValidator(GetDashboardBySlugSchema)
  .handler(async ({ data }): Promise<DashboardWithProfiles> => {
    const supabase = createServerClient() as any

    // Get dashboard by slug
    const { data: dashboard, error: dashboardError } = await supabase
      .from('dashboards')
      .select('*')
      .eq('slug', data.slug)
      .single()

    if (dashboardError || !dashboard) {
      throw new Error('Dashboard not found')
    }

    // Check access
    let userRole: string | null = null
    if (data.userId) {
      const { data: membership } = await supabase
        .from('dashboard_profiles')
        .select('role')
        .eq('dashboard_id', dashboard.id)
        .eq('profile_id', data.userId)
        .single()

      userRole = membership?.role || null
    }

    if (!dashboard.is_public && !userRole) {
      throw new Error('This dashboard is private')
    }

    // Get all profiles
    const { data: profiles } = await supabase
      .from('dashboard_profiles')
      .select('*')
      .eq('dashboard_id', dashboard.id)

    // Get user info for all profiles
    const profileUserIds = (profiles || []).map((p: any) => p.profile_id)
    const userMap = await buildProfilesWithUser(supabase, profileUserIds)

    const dashboardProfiles = (profiles || []).map(
      (p: any): DashboardProfileWithUser => {
        const userData = userMap.get(p.profile_id)
        return {
          ...p,
          profile: userData?.profile || {
            id: p.profile_id,
            full_name: null,
            email: '',
          },
          athlete: userData?.athlete || null,
        }
      }
    )

    return {
      ...dashboard,
      profiles: dashboardProfiles,
      profile_count: dashboardProfiles.length,
      current_user_role: userRole || 'viewer',
    }
  })

// =====================================================
// UPDATE DASHBOARD
// =====================================================

export const updateDashboard = createServerFn({ method: 'POST' })
  .inputValidator(UpdateDashboardSchema)
  .handler(async ({ data }): Promise<Dashboard> => {
    const supabase = createServerClient() as any

    // Verify user is owner
    const { data: dashboard, error: dashboardError } = await supabase
      .from('dashboards')
      .select('owner_id')
      .eq('id', data.dashboardId)
      .single()

    if (dashboardError || !dashboard || dashboard.owner_id !== data.userId) {
      throw new Error('Only the dashboard owner can update the dashboard')
    }

    // If setting this dashboard as default, unset other defaults for this user
    if (data.isDefault === true) {
      await supabase
        .from('dashboards')
        .update({ is_default: false })
        .eq('owner_id', data.userId)
        .neq('id', data.dashboardId)
    }

    const updates: Record<string, any> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (data.isPublic !== undefined) updates.is_public = data.isPublic
    if (data.isDefault !== undefined) updates.is_default = data.isDefault
    if (data.slug !== undefined) updates.slug = data.slug

    const { data: updatedDashboard, error } = await supabase
      .from('dashboards')
      .update(updates)
      .eq('id', data.dashboardId)
      .select()
      .single()

    if (error) {
      console.error('Error updating dashboard:', error)
      throw new Error('Failed to update dashboard')
    }

    return updatedDashboard as Dashboard
  })

// =====================================================
// CREATE INVITE
// =====================================================

export const createInvite = createServerFn({ method: 'POST' })
  .inputValidator(CreateInviteSchema)
  .handler(async ({ data }): Promise<InviteLinkData> => {
    const supabase = createServerClient() as any

    // Verify user can edit dashboard
    const { data: membership } = await supabase
      .from('dashboard_profiles')
      .select('role')
      .eq('dashboard_id', data.dashboardId)
      .eq('profile_id', data.userId)
      .single()

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      throw new Error('Only owners and editors can create invites')
    }

    // Generate invite code
    const { data: inviteCode } = await supabase.rpc(
      'generate_dashboard_invite_code'
    )

    // Calculate expiration
    let expiresAt: string | null = null
    if (data.expiresInDays) {
      const expDate = new Date()
      expDate.setDate(expDate.getDate() + data.expiresInDays)
      expiresAt = expDate.toISOString()
    }

    // Get dashboard name for response
    const { data: dashboard } = await supabase
      .from('dashboards')
      .select('name')
      .eq('id', data.dashboardId)
      .single()

    // Create invite
    const { data: invite, error } = await supabase
      .from('dashboard_invites')
      .insert({
        dashboard_id: data.dashboardId,
        invite_code: inviteCode,
        role: data.role,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invite:', error)
      throw new Error('Failed to create invite')
    }

    return {
      code: invite.invite_code,
      role: invite.role,
      expiresAt: invite.expires_at,
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
    const supabase = createServerClient() as any

    // Verify user can edit dashboard
    const { data: membership } = await supabase
      .from('dashboard_profiles')
      .select('role')
      .eq('dashboard_id', data.dashboardId)
      .eq('profile_id', data.userId)
      .single()

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      throw new Error('Only owners and editors can view invites')
    }

    const { data: invites, error } = await supabase
      .from('dashboard_invites')
      .select('*')
      .eq('dashboard_id', data.dashboardId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invites:', error)
      throw new Error('Failed to fetch invites')
    }

    return invites as DashboardInvite[]
  })

// =====================================================
// DELETE INVITE
// =====================================================

export const deleteInvite = createServerFn({ method: 'POST' })
  .inputValidator(DeleteInviteSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = createServerClient() as any

    // Get the invite to find the dashboard
    const { data: invite } = await supabase
      .from('dashboard_invites')
      .select('dashboard_id')
      .eq('id', data.inviteId)
      .single()

    if (!invite) {
      throw new Error('Invite not found')
    }

    // Verify user is owner
    const { data: dashboard } = await supabase
      .from('dashboards')
      .select('owner_id')
      .eq('id', invite.dashboard_id)
      .single()

    if (!dashboard || dashboard.owner_id !== data.userId) {
      throw new Error('Only the dashboard owner can delete invites')
    }

    const { error } = await supabase
      .from('dashboard_invites')
      .delete()
      .eq('id', data.inviteId)

    if (error) {
      console.error('Error deleting invite:', error)
      throw new Error('Failed to delete invite')
    }

    return { success: true }
  })

// =====================================================
// DELETE DASHBOARD
// =====================================================

export const deleteDashboard = createServerFn({ method: 'POST' })
  .inputValidator(DeleteDashboardSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = createServerClient() as any

    // Verify user is owner
    const { data: dashboard, error: dashboardError } = await supabase
      .from('dashboards')
      .select('owner_id')
      .eq('id', data.dashboardId)
      .single()

    if (dashboardError || !dashboard || dashboard.owner_id !== data.userId) {
      throw new Error('Only the dashboard owner can delete the dashboard')
    }

    // Delete the dashboard (cascade will handle profiles, invites, and configs)
    const { error } = await supabase
      .from('dashboards')
      .delete()
      .eq('id', data.dashboardId)

    if (error) {
      console.error('Error deleting dashboard:', error)
      throw new Error('Failed to delete dashboard')
    }

    return { success: true }
  })

// =====================================================
// REMOVE PROFILE FROM DASHBOARD
// =====================================================

export const removeProfile = createServerFn({ method: 'POST' })
  .inputValidator(RemoveProfileSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = createServerClient() as any

    // Verify user is owner
    const { data: dashboard } = await supabase
      .from('dashboards')
      .select('owner_id')
      .eq('id', data.dashboardId)
      .single()

    if (!dashboard || dashboard.owner_id !== data.userId) {
      throw new Error('Only the dashboard owner can remove profiles')
    }

    // Prevent removing the owner
    if (data.profileId === dashboard.owner_id) {
      throw new Error('Cannot remove the dashboard owner')
    }

    const { error } = await supabase
      .from('dashboard_profiles')
      .delete()
      .eq('dashboard_id', data.dashboardId)
      .eq('profile_id', data.profileId)

    if (error) {
      console.error('Error removing profile:', error)
      throw new Error('Failed to remove profile')
    }

    return { success: true }
  })

// =====================================================
// UPDATE PROFILE ROLE
// =====================================================

export const updateProfileRole = createServerFn({ method: 'POST' })
  .inputValidator(UpdateProfileRoleSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = createServerClient() as any

    // Verify user is owner
    const { data: dashboard } = await supabase
      .from('dashboards')
      .select('owner_id')
      .eq('id', data.dashboardId)
      .single()

    if (!dashboard || dashboard.owner_id !== data.userId) {
      throw new Error('Only the dashboard owner can change roles')
    }

    // Prevent changing owner's role
    if (data.profileId === dashboard.owner_id) {
      throw new Error("Cannot change the owner's role")
    }

    const { error } = await supabase
      .from('dashboard_profiles')
      .update({ role: data.role })
      .eq('dashboard_id', data.dashboardId)
      .eq('profile_id', data.profileId)

    if (error) {
      console.error('Error updating role:', error)
      throw new Error('Failed to update role')
    }

    return { success: true }
  })

// =====================================================
// GET USER'S DEFAULT DASHBOARD
// =====================================================

export const getDefaultDashboard = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }): Promise<Dashboard | null> => {
    const supabase = createServerClient() as any

    // First try to find a default dashboard
    const { data: defaultDashboard } = await supabase
      .from('dashboards')
      .select('*')
      .eq('owner_id', data.userId)
      .eq('is_default', true)
      .single()

    if (defaultDashboard) {
      return defaultDashboard as Dashboard
    }

    // If no default, get first dashboard user is a member of
    const { data: membership } = await supabase
      .from('dashboard_profiles')
      .select('dashboard_id')
      .eq('profile_id', data.userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single()

    if (membership) {
      const { data: dashboard } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', membership.dashboard_id)
        .single()

      return dashboard as Dashboard | null
    }

    return null
  })
