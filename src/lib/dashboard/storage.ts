import type { DashboardConfig, ActivityCardConfig } from '@/types/dashboard'

const DASHBOARD_STORAGE_KEY = 'dashboard_config'

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
 * Save dashboard configuration
 */
export function saveDashboardConfig(config: DashboardConfig): void {
  localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(config))
}

/**
 * Get dashboard configuration
 */
export function getDashboardConfig(): DashboardConfig {
  const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY)

  if (stored) {
    try {
      const config = JSON.parse(stored) as DashboardConfig
      // Ensure all required fields exist
      if (!config.preferences) {
        config.preferences = getDefaultDashboardConfig().preferences
      }
      return config
    } catch (error) {
      console.error('Error parsing dashboard config:', error)
    }
  }

  // Return default config
  return getDefaultDashboardConfig()
}

/**
 * Add a new card to the dashboard
 */
export function addDashboardCard(card: Omit<ActivityCardConfig, 'id' | 'position' | 'createdAt' | 'updatedAt'>): string {
  const config = getDashboardConfig()

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
  saveDashboardConfig(config)

  return cardId
}

/**
 * Update an existing card
 */
export function updateDashboardCard(cardId: string, updates: Partial<ActivityCardConfig>): void {
  const config = getDashboardConfig()

  if (!config.cards[cardId]) {
    throw new Error(`Card ${cardId} not found`)
  }

  config.cards[cardId] = {
    ...config.cards[cardId],
    ...updates,
    updatedAt: Date.now(),
  }

  saveDashboardConfig(config)
}

/**
 * Delete a card
 */
export function deleteDashboardCard(cardId: string): void {
  const config = getDashboardConfig()
  delete config.cards[cardId]
  saveDashboardConfig(config)
}

/**
 * Get all visible cards sorted by position
 */
export function getVisibleCards(): ActivityCardConfig[] {
  const config = getDashboardConfig()
  return Object.values(config.cards)
    .filter(card => card.visible)
    .sort((a, b) => a.position - b.position) as ActivityCardConfig[]
}

/**
 * Clear all dashboard data
 */
export function clearDashboardConfig(): void {
  localStorage.removeItem(DASHBOARD_STORAGE_KEY)
}
