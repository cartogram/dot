/**
 * Supabase Group Dashboard Storage
 *
 * Handles group dashboard configuration persistence to Supabase.
 * Similar to lib/supabase/dashboard.ts but for groups.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import type { DashboardConfig, ActivityCardConfig } from '@/types/dashboard'

/**
 * Default group dashboard configuration
 */
function getDefaultGroupDashboardConfig(): DashboardConfig {
  return {
    version: 1,
    cards: {},
    layout: 'grid',
    preferences: {
      defaultCardSize: 'medium',
      defaultTimeFrame: 'week',
    },
  }
}

/**
 * Get the group's active dashboard configuration from Supabase
 */
export async function getGroupDashboardConfig(
  supabase: SupabaseClient<Database>,
  groupId: string,
): Promise<DashboardConfig> {
  const { data, error } = await supabase
    .from('group_dashboard_configs')
    .select('config')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('Error fetching group dashboard config:', error)
    throw new Error('Failed to load group dashboard configuration')
  }

  // If no config exists yet, return default
  if (!data) {
    return getDefaultGroupDashboardConfig()
  }

  // Ensure all required fields exist
  const config = data.config
  if (!config.preferences) {
    config.preferences = getDefaultGroupDashboardConfig().preferences
  }

  return config
}

/**
 * Save group dashboard configuration to Supabase
 * Uses upsert to handle both create and update
 */
export async function saveGroupDashboardConfig(
  supabase: SupabaseClient<Database>,
  groupId: string,
  config: DashboardConfig,
): Promise<void> {
  // First, check if active config exists
  const { data: existing } = await supabase
    .from('group_dashboard_configs')
    .select('id')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    // Update existing config
    const { error } = await supabase
      .from('group_dashboard_configs')
      .update({ config, version: config.version })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating group dashboard config:', error)
      throw new Error('Failed to save group dashboard configuration')
    }
  } else {
    // Create new config
    const { error } = await supabase.from('group_dashboard_configs').insert({
      group_id: groupId,
      config,
      version: config.version,
      is_active: true,
    })

    if (error) {
      console.error('Error creating group dashboard config:', error)
      throw new Error('Failed to save group dashboard configuration')
    }
  }
}

/**
 * Add a new card to the group dashboard
 */
export async function addGroupDashboardCard(
  supabase: SupabaseClient<Database>,
  groupId: string,
  card: Omit<ActivityCardConfig, 'id' | 'position' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const config = await getGroupDashboardConfig(supabase, groupId)

  // Generate unique ID
  const cardId = `${card.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Calculate next position
  const maxPosition = Math.max(
    0,
    ...Object.values(config.cards).map((c) => c.position),
  )

  const newCard: ActivityCardConfig = {
    ...card,
    id: cardId,
    position: maxPosition + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  config.cards[cardId] = newCard
  await saveGroupDashboardConfig(supabase, groupId, config)

  return cardId
}

/**
 * Update an existing card in the group dashboard
 */
export async function updateGroupDashboardCard(
  supabase: SupabaseClient<Database>,
  groupId: string,
  cardId: string,
  updates: Partial<ActivityCardConfig>,
): Promise<void> {
  const config = await getGroupDashboardConfig(supabase, groupId)

  if (!config.cards[cardId]) {
    throw new Error(`Card ${cardId} not found`)
  }

  config.cards[cardId] = {
    ...config.cards[cardId],
    ...updates,
    updatedAt: Date.now(),
  }

  await saveGroupDashboardConfig(supabase, groupId, config)
}

/**
 * Delete a card from the group dashboard
 */
export async function deleteGroupDashboardCard(
  supabase: SupabaseClient<Database>,
  groupId: string,
  cardId: string,
): Promise<void> {
  const config = await getGroupDashboardConfig(supabase, groupId)
  delete config.cards[cardId]
  await saveGroupDashboardConfig(supabase, groupId, config)
}

/**
 * Get all visible cards sorted by position
 */
export async function getVisibleGroupCards(
  supabase: SupabaseClient<Database>,
  groupId: string,
): Promise<ActivityCardConfig[]> {
  const config = await getGroupDashboardConfig(supabase, groupId)
  return Object.values(config.cards)
    .filter((card) => card.visible)
    .sort((a, b) => a.position - b.position) as ActivityCardConfig[]
}

/**
 * Clear all dashboard data for a group
 */
export async function clearGroupDashboardConfig(
  supabase: SupabaseClient<Database>,
  groupId: string,
): Promise<void> {
  const { error } = await supabase
    .from('group_dashboard_configs')
    .delete()
    .eq('group_id', groupId)

  if (error) {
    console.error('Error clearing group dashboard config:', error)
    throw new Error('Failed to clear group dashboard configuration')
  }
}
