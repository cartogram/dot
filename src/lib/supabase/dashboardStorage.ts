/**
 * Dashboard Storage
 *
 * Handles dashboard configuration persistence to Supabase.
 * Manages card configs stored in the dashboards.config column.
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
 * Get the dashboard's configuration from Supabase
 */
export async function getDashboardConfigById(
  supabase: SupabaseClient<Database>,
  dashboardId: string
): Promise<DashboardConfig> {
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
export async function saveDashboardConfigById(
  supabase: SupabaseClient<Database>,
  dashboardId: string,
  _userId: string, // Kept for API compatibility, not needed for direct update
  config: DashboardConfig
): Promise<void> {
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
export async function addDashboardCardById(
  supabase: SupabaseClient<Database>,
  dashboardId: string,
  userId: string,
  card: Omit<ActivityCardConfig, 'id' | 'position' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const config = await getDashboardConfigById(supabase, dashboardId)

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
  await saveDashboardConfigById(supabase, dashboardId, userId, config)

  return cardId
}

/**
 * Update an existing card in the dashboard
 */
export async function updateDashboardCardById(
  supabase: SupabaseClient<Database>,
  dashboardId: string,
  userId: string,
  cardId: string,
  updates: Partial<ActivityCardConfig>
): Promise<void> {
  const config = await getDashboardConfigById(supabase, dashboardId)

  if (!config.cards[cardId]) {
    throw new Error(`Card ${cardId} not found`)
  }

  config.cards[cardId] = {
    ...config.cards[cardId],
    ...updates,
    updatedAt: Date.now(),
  }

  await saveDashboardConfigById(supabase, dashboardId, userId, config)
}

/**
 * Delete a card from the dashboard
 */
export async function deleteDashboardCardById(
  supabase: SupabaseClient<Database>,
  dashboardId: string,
  userId: string,
  cardId: string
): Promise<void> {
  const config = await getDashboardConfigById(supabase, dashboardId)
  delete config.cards[cardId]
  await saveDashboardConfigById(supabase, dashboardId, userId, config)
}

/**
 * Update card positions (for reordering)
 */
export async function updateCardPositions(
  supabase: SupabaseClient<Database>,
  dashboardId: string,
  userId: string,
  cardPositions: { cardId: string; position: number }[]
): Promise<void> {
  const config = await getDashboardConfigById(supabase, dashboardId)

  for (const { cardId, position } of cardPositions) {
    if (config.cards[cardId]) {
      config.cards[cardId].position = position
      config.cards[cardId].updatedAt = Date.now()
    }
  }

  await saveDashboardConfigById(supabase, dashboardId, userId, config)
}

/**
 * Get all visible cards sorted by position
 */
export async function getVisibleDashboardCards(
  supabase: SupabaseClient<Database>,
  dashboardId: string
): Promise<ActivityCardConfig[]> {
  const config = await getDashboardConfigById(supabase, dashboardId)
  return Object.values(config.cards)
    .filter((card) => card.visible)
    .sort((a, b) => a.position - b.position) as ActivityCardConfig[]
}

/**
 * Get all cards (including hidden) sorted by position
 */
export async function getAllDashboardCards(
  supabase: SupabaseClient<Database>,
  dashboardId: string
): Promise<ActivityCardConfig[]> {
  const config = await getDashboardConfigById(supabase, dashboardId)
  return Object.values(config.cards).sort(
    (a, b) => a.position - b.position
  ) as ActivityCardConfig[]
}

/**
 * Toggle card visibility
 */
export async function toggleCardVisibility(
  supabase: SupabaseClient<Database>,
  dashboardId: string,
  userId: string,
  cardId: string
): Promise<void> {
  const config = await getDashboardConfigById(supabase, dashboardId)

  if (!config.cards[cardId]) {
    throw new Error(`Card ${cardId} not found`)
  }

  config.cards[cardId].visible = !config.cards[cardId].visible
  config.cards[cardId].updatedAt = Date.now()

  await saveDashboardConfigById(supabase, dashboardId, userId, config)
}

/**
 * Clear all dashboard card data (reset to default config)
 */
export async function clearDashboardConfigById(
  supabase: SupabaseClient<Database>,
  dashboardId: string
): Promise<void> {
  const { error } = await supabase
    .from('dashboards')
    .update({ config: getDefaultDashboardConfig() })
    .eq('id', dashboardId)

  if (error) {
    console.error('Error clearing dashboard config:', error)
    throw new Error('Failed to clear dashboard configuration')
  }
}

/**
 * Duplicate cards from one dashboard to another
 * Useful for creating templates or copying dashboard setups
 */
export async function duplicateDashboardConfig(
  supabase: SupabaseClient<Database>,
  sourceDashboardId: string,
  targetDashboardId: string,
  userId: string
): Promise<void> {
  const sourceConfig = await getDashboardConfigById(supabase, sourceDashboardId)

  // Create new card IDs for duplicated cards
  const newCards: Record<string, ActivityCardConfig> = {}
  for (const [_oldId, card] of Object.entries(sourceConfig.cards)) {
    const newId = `${card.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    newCards[newId] = {
      ...card,
      id: newId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  const newConfig: DashboardConfig = {
    ...sourceConfig,
    cards: newCards,
  }

  await saveDashboardConfigById(supabase, targetDashboardId, userId, newConfig)
}
