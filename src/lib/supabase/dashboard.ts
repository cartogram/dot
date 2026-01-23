/**
 * Supabase Dashboard Storage (Personal Dashboard)
 *
 * Handles dashboard configuration for the user's personal/default dashboard.
 * This queries the user's default dashboard from the dashboards table.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import type { DashboardConfig, ActivityCardConfig } from '@/types/dashboard'

/**
 * Default dashboard configuration
 */
function getDefaultDashboardConfig(): DashboardConfig {
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
 * Get the user's default dashboard ID, creating one if it doesn't exist
 */
async function getOrCreateDefaultDashboard(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string> {
  // Try to find existing default dashboard
  const { data: existing } = await supabase
    .from('dashboards')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_default', true)
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  // Create a default dashboard for the user
  const { data: newDashboard, error } = await supabase
    .from('dashboards')
    .insert({
      name: 'My Dashboard',
      owner_id: userId,
      is_default: true,
      config: getDefaultDashboardConfig(),
    })
    .select('id')
    .single()

  if (error || !newDashboard) {
    console.error('Error creating default dashboard:', error)
    throw new Error('Failed to create default dashboard')
  }

  // Add owner to dashboard_profiles
  await supabase.from('dashboard_profiles').insert({
    dashboard_id: newDashboard.id,
    profile_id: userId,
    role: 'owner',
  })

  return newDashboard.id
}

/**
 * Get the user's active dashboard configuration from Supabase
 */
export async function getDashboardConfig(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<DashboardConfig> {
  const dashboardId = await getOrCreateDefaultDashboard(supabase, userId)

  const { data, error } = await supabase
    .from('dashboards')
    .select('config')
    .eq('id', dashboardId)
    .single()

  if (error) {
    console.error('Error fetching dashboard config:', error)
    throw new Error('Failed to load dashboard configuration')
  }

  // If no config exists yet, return default
  if (!data?.config) {
    return getDefaultDashboardConfig()
  }

  // Ensure all required fields exist
  const config = data.config as DashboardConfig
  if (!config.preferences) {
    config.preferences = getDefaultDashboardConfig().preferences
  }
  if (!config.cards) {
    config.cards = {}
  }

  return config
}

/**
 * Save dashboard configuration to Supabase
 */
export async function saveDashboardConfig(
  supabase: SupabaseClient<Database>,
  userId: string,
  config: DashboardConfig
): Promise<void> {
  const dashboardId = await getOrCreateDefaultDashboard(supabase, userId)

  const { error } = await supabase
    .from('dashboards')
    .update({ config })
    .eq('id', dashboardId)

  if (error) {
    console.error('Error saving dashboard config:', error)
    throw new Error('Failed to save dashboard configuration')
  }
}

/**
 * Add a new card to the dashboard
 */
export async function addDashboardCard(
  supabase: SupabaseClient<Database>,
  userId: string,
  card: Omit<ActivityCardConfig, 'id' | 'position' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const config = await getDashboardConfig(supabase, userId)

  // Generate unique ID
  const cardId = `${card.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Calculate next position
  const maxPosition = Math.max(
    0,
    ...Object.values(config.cards).map((c) => c.position)
  )

  const newCard: ActivityCardConfig = {
    ...card,
    id: cardId,
    position: maxPosition + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  config.cards[cardId] = newCard
  await saveDashboardConfig(supabase, userId, config)

  return cardId
}

/**
 * Update an existing card
 */
export async function updateDashboardCard(
  supabase: SupabaseClient<Database>,
  userId: string,
  cardId: string,
  updates: Partial<ActivityCardConfig>
): Promise<void> {
  const config = await getDashboardConfig(supabase, userId)

  if (!config.cards[cardId]) {
    throw new Error(`Card ${cardId} not found`)
  }

  config.cards[cardId] = {
    ...config.cards[cardId],
    ...updates,
    updatedAt: Date.now(),
  }

  await saveDashboardConfig(supabase, userId, config)
}

/**
 * Delete a card
 */
export async function deleteDashboardCard(
  supabase: SupabaseClient<Database>,
  userId: string,
  cardId: string
): Promise<void> {
  const config = await getDashboardConfig(supabase, userId)
  delete config.cards[cardId]
  await saveDashboardConfig(supabase, userId, config)
}

/**
 * Get all visible cards sorted by position
 */
export async function getVisibleCards(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ActivityCardConfig[]> {
  const config = await getDashboardConfig(supabase, userId)
  return Object.values(config.cards)
    .filter((card) => card.visible)
    .sort((a, b) => a.position - b.position) as ActivityCardConfig[]
}

/**
 * Clear all dashboard data for a user (reset to default)
 */
export async function clearDashboardConfig(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const dashboardId = await getOrCreateDefaultDashboard(supabase, userId)

  const { error } = await supabase
    .from('dashboards')
    .update({ config: getDefaultDashboardConfig() })
    .eq('id', dashboardId)

  if (error) {
    console.error('Error clearing dashboard config:', error)
    throw new Error('Failed to clear dashboard configuration')
  }
}
