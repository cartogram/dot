/**
 * Server functions for group CRUD operations
 *
 * These functions use the service role key to bypass RLS
 * where necessary (e.g., when looking up groups by invite code)
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { Group } from '@/lib/supabase/types'
import type { GroupWithMembers, GroupMemberWithProfile } from '@/types/groups'

// =====================================================
// SCHEMAS
// =====================================================

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  userId: z.string().uuid(),
})

const JoinGroupSchema = z.object({
  inviteCode: z.string().min(1),
  userId: z.string().uuid(),
})

const LeaveGroupSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
})

const GetGroupSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
})

const GetUserGroupsSchema = z.object({
  userId: z.string().uuid(),
})

const UpdateGroupSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
})

const RegenerateInviteCodeSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
})

const DeleteGroupSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
})

// =====================================================
// CREATE GROUP
// =====================================================

export const createGroup = createServerFn({ method: 'POST' })
  .inputValidator(CreateGroupSchema)
  .handler(async ({ data }): Promise<Group> => {
    const supabase = createServerClient() as any

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: data.name,
        description: data.description || null,
        owner_id: data.userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating group:', error)
      throw new Error('Failed to create group')
    }

    return group as Group
  })

// =====================================================
// JOIN GROUP (by invite code)
// =====================================================

export const joinGroup = createServerFn({ method: 'POST' })
  .inputValidator(JoinGroupSchema)
  .handler(async ({ data }): Promise<Group> => {
    const supabase = createServerClient() as any

    // Find the group by invite code
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', data.inviteCode.toUpperCase())
      .single()

    if (groupError || !group) {
      throw new Error('Invalid invite code')
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', data.userId)
      .maybeSingle()

    if (existingMember) {
      throw new Error('You are already a member of this group')
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: data.userId,
        role: 'member',
      })

    if (memberError) {
      console.error('Error joining group:', memberError)
      throw new Error('Failed to join group')
    }

    return group as Group
  })

// =====================================================
// LEAVE GROUP
// =====================================================

export const leaveGroup = createServerFn({ method: 'POST' })
  .inputValidator(LeaveGroupSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = createServerClient() as any

    // Check if user is the owner
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', data.groupId)
      .single()

    if (group?.owner_id === data.userId) {
      throw new Error('Group owners cannot leave. Transfer ownership or delete the group.')
    }

    // Remove user from group
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', data.groupId)
      .eq('user_id', data.userId)

    if (error) {
      console.error('Error leaving group:', error)
      throw new Error('Failed to leave group')
    }

    return { success: true }
  })

// =====================================================
// GET USER'S GROUPS
// =====================================================

export const getUserGroups = createServerFn({ method: 'GET' })
  .inputValidator(GetUserGroupsSchema)
  .handler(async ({ data }): Promise<GroupWithMembers[]> => {
    const supabase = createServerClient() as any

    // Get all groups the user is a member of
    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', data.userId)

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError)
      throw new Error('Failed to fetch groups')
    }

    if (!memberships || memberships.length === 0) {
      return []
    }

    const groupIds = memberships.map((m: any) => m.group_id)

    // Get group details
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)

    if (groupsError || !groups) {
      console.error('Error fetching groups:', groupsError)
      throw new Error('Failed to fetch groups')
    }

    // Get members for all groups
    const { data: allMembers, error: membersError } = await supabase
      .from('group_members')
      .select(`
        id,
        group_id,
        user_id,
        role,
        joined_at
      `)
      .in('group_id', groupIds)

    if (membersError) {
      console.error('Error fetching members:', membersError)
    }

    // Get profile info for all members
    const memberUserIds = [...new Set((allMembers || []).map((m: any) => m.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', memberUserIds)

    // Get athlete data for members
    const { data: dataSources } = await supabase
      .from('data_sources')
      .select('user_id, athlete_data')
      .eq('provider', 'strava')
      .eq('is_active', true)
      .in('user_id', memberUserIds)

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    const athleteMap = new Map(
      (dataSources || []).map((ds: any) => [ds.user_id, ds.athlete_data])
    )

    // Build GroupWithMembers for each group
    return groups.map((group: any) => {
      const groupMembers = (allMembers || [])
        .filter((m: any) => m.group_id === group.id)
        .map((m: any): GroupMemberWithProfile => {
          const profile = profileMap.get(m.user_id) as any
          const athleteData = athleteMap.get(m.user_id) as any
          return {
            ...m,
            profile: {
              id: m.user_id,
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
          }
        })

      const userMembership = memberships.find((m: any) => m.group_id === group.id)

      return {
        ...group,
        members: groupMembers,
        member_count: groupMembers.length,
        current_user_role: userMembership?.role || 'member',
      }
    })
  })

// =====================================================
// GET SINGLE GROUP
// =====================================================

export const getGroup = createServerFn({ method: 'GET' })
  .inputValidator(GetGroupSchema)
  .handler(async ({ data }): Promise<GroupWithMembers> => {
    const supabase = createServerClient() as any

    // Verify user is a member
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', data.groupId)
      .eq('user_id', data.userId)
      .single()

    if (membershipError || !membership) {
      throw new Error('You are not a member of this group')
    }

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', data.groupId)
      .single()

    if (groupError || !group) {
      throw new Error('Group not found')
    }

    // Get all members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', data.groupId)

    if (membersError) {
      console.error('Error fetching members:', membersError)
    }

    // Get profile info for all members
    const memberUserIds = (members || []).map((m: any) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', memberUserIds)

    // Get athlete data for members
    const { data: dataSources } = await supabase
      .from('data_sources')
      .select('user_id, athlete_data')
      .eq('provider', 'strava')
      .eq('is_active', true)
      .in('user_id', memberUserIds)

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    const athleteMap = new Map(
      (dataSources || []).map((ds: any) => [ds.user_id, ds.athlete_data])
    )

    const groupMembers = (members || []).map((m: any): GroupMemberWithProfile => {
      const profile = profileMap.get(m.user_id) as any
      const athleteData = athleteMap.get(m.user_id) as any
      return {
        ...m,
        profile: {
          id: m.user_id,
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
      }
    })

    return {
      ...group,
      members: groupMembers,
      member_count: groupMembers.length,
      current_user_role: membership.role,
    }
  })

// =====================================================
// UPDATE GROUP
// =====================================================

export const updateGroup = createServerFn({ method: 'POST' })
  .inputValidator(UpdateGroupSchema)
  .handler(async ({ data }): Promise<Group> => {
    const supabase = createServerClient() as any

    // Verify user is owner
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', data.groupId)
      .single()

    if (groupError || !group || group.owner_id !== data.userId) {
      throw new Error('Only the group owner can update the group')
    }

    const updates: Record<string, any> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description

    const { data: updatedGroup, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', data.groupId)
      .select()
      .single()

    if (error) {
      console.error('Error updating group:', error)
      throw new Error('Failed to update group')
    }

    return updatedGroup as Group
  })

// =====================================================
// REGENERATE INVITE CODE
// =====================================================

export const regenerateInviteCode = createServerFn({ method: 'POST' })
  .inputValidator(RegenerateInviteCodeSchema)
  .handler(async ({ data }): Promise<{ inviteCode: string }> => {
    const supabase = createServerClient() as any

    // Verify user is owner or admin
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', data.groupId)
      .eq('user_id', data.userId)
      .single()

    if (
      membershipError ||
      !membership ||
      !['owner', 'admin'].includes(membership.role)
    ) {
      throw new Error('Only group owners and admins can regenerate invite codes')
    }

    // Generate new invite code using the database function
    const { data: result, error } = await supabase.rpc('generate_invite_code')

    if (error) {
      console.error('Error generating invite code:', error)
      throw new Error('Failed to generate invite code')
    }

    const newCode = result as string

    // Update the group with the new code
    const { error: updateError } = await supabase
      .from('groups')
      .update({ invite_code: newCode })
      .eq('id', data.groupId)

    if (updateError) {
      console.error('Error updating invite code:', updateError)
      throw new Error('Failed to update invite code')
    }

    return { inviteCode: newCode }
  })

// =====================================================
// DELETE GROUP
// =====================================================

export const deleteGroup = createServerFn({ method: 'POST' })
  .inputValidator(DeleteGroupSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = createServerClient() as any

    // Verify user is owner
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', data.groupId)
      .single()

    if (groupError || !group || group.owner_id !== data.userId) {
      throw new Error('Only the group owner can delete the group')
    }

    // Delete the group (cascade will handle members and configs)
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', data.groupId)

    if (error) {
      console.error('Error deleting group:', error)
      throw new Error('Failed to delete group')
    }

    return { success: true }
  })
