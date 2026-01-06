import type { ActivityGoal } from './strava'

// Card types - extensible for future card types
export type CardType = 'activity' | 'chart' | 'summary'

// Time frame options
export type TimeFrame = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom'

// Card size for grid layout
export type CardSize = 'small' | 'medium' | 'large'

// Display modes for activity cards
export type DisplayMode = 'card' | 'compact' | 'detailed'

// Base card interface - all cards extend this
export interface BaseCard {
  id: string
  type: CardType
  title: string
  size: CardSize
  position: number // for ordering cards
  visible: boolean
  createdAt: number // timestamp
  updatedAt: number // timestamp
}

// Activity card configuration
export interface ActivityCardConfig extends BaseCard {
  type: 'activity'
  timeFrame: TimeFrame
  customDateRange?: {
    start: string // ISO date string
    end: string // ISO date string
  }
  activityIds: string[] // single or combined activities from ACTIVITY_CONFIGS
  metrics: {
    distance: boolean
    count: boolean
    elevation: boolean
    time: boolean
  }
  showMetrics: {
    distance: boolean
    count: boolean
    elevation: boolean
    time: boolean
  }
  goal?: ActivityGoal
  displayMode: DisplayMode
}

// Union type for all card types (extensible)
export type DashboardCard = ActivityCardConfig // | ChartCardConfig | SummaryCardConfig (future)

// Dashboard configuration
export interface DashboardConfig {
  version: number // for future migrations
  cards: Record<string, DashboardCard>
  layout: 'grid' | 'masonry'
  preferences: {
    defaultCardSize: CardSize
    defaultTimeFrame: TimeFrame
  }
}

// Helper type for creating new cards
export type NewActivityCard = Omit<ActivityCardConfig, 'id' | 'position' | 'createdAt' | 'updatedAt'>
