/**
 * Supabase Dashboard Storage
 *
 * Handles dashboard configuration persistence to Supabase.
 * This replaces the localStorage-based storage in lib/dashboard/storage.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, DashboardConfigRow } from './types'
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
 * Get the user's active dashboard configuration from Supabase
 */
export async function getDashboardConfig(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<DashboardConfig> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .select('config')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('Error fetching dashboard config:', error)
    throw new Error('Failed to load dashboard configuration')
  }

  // If no config exists yet, return default
  if (!data) {
    return getDefaultDashboardConfig()
  }

  // Ensure all required fields exist
  const config = data.config
  if (!config.preferences) {
    config.preferences = getDefaultDashboardConfig().preferences
  }

  return config
}

/**
 * Save dashboard configuration to Supabase
 * Uses upsert to handle both create and update
 */
export async function saveDashboardConfig(
  supabase: SupabaseClient<Database>,
  userId: string,
  config: DashboardConfig
): Promise<void> {
  // First, check if active config exists
  const { data: existing } = await supabase
    .from('dashboard_configs')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    // Update existing config
    const { error } = await supabase
      .from('dashboard_configs')
      .update({ config, version: config.version })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating dashboard config:', error)
      throw new Error('Failed to save dashboard configuration')
    }
  } else {
    // Create new config
    const { error } = await supabase
      .from('dashboard_configs')
      .insert({
        user_id: userId,
        config,
        version: config.version,
        is_active: true,
      })

    if (error) {
      console.error('Error creating dashboard config:', error)
      throw new Error('Failed to save dashboard configuration')
    }
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
  const maxPosition = Math.max(0, ...Object.values(config.cards).map(c => c.position))

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
    .filter(card => card.visible)
    .sort((a, b) => a.position - b.position) as ActivityCardConfig[]
}

/**
 * Clear all dashboard data for a user
 */
export async function clearDashboardConfig(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('dashboard_configs')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Error clearing dashboard config:', error)
    throw new Error('Failed to clear dashboard configuration')
  }
}

/**
 * Migrate localStorage dashboard config to Supabase
 * Call this once during user onboarding/first login
 */
export async function migrateLocalStorageToSupabase(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const DASHBOARD_STORAGE_KEY = 'dashboard_config'
  const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY)

  if (!stored) {
    return // Nothing to migrate
  }

  try {
    const config = JSON.parse(stored) as DashboardConfig
    await saveDashboardConfig(supabase, userId, config)

    // Clear localStorage after successful migration
    localStorage.removeItem(DASHBOARD_STORAGE_KEY)
    console.log('Successfully migrated dashboard config to Supabase')
  } catch (error) {
    console.error('Error migrating dashboard config:', error)
    // Don't throw - migration failure shouldn't block user
  }
}
