import type { ActivityType, Metric } from '@/types/dashboard'

export interface ActivityConfig {
  id: string // e.g., 'running', 'cycling'
  activityType: ActivityType // Type value stored in DB
  stravaType: string // Strava API type: 'Run', 'Ride', etc.
  displayName: string // UI label: 'Running', 'Cycling'
  icon?: string // Optional icon identifier
  metrics: {
    distance: boolean // Track distance goals
    count: boolean // Track activity count
    elevation: boolean // Track elevation goals
    time: boolean // Track time goals
  }
  primaryMetric: Metric // Main progress indicator
  useStatsApi: boolean // true for Ride/Run/Swim, false for others
}

export const ACTIVITY_CONFIGS: Record<string, ActivityConfig> = {
  running: {
    id: 'running',
    activityType: 'Run',
    stravaType: 'Run',
    displayName: 'Running',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'distance',
    useStatsApi: true,
  },
  cycling: {
    id: 'cycling',
    activityType: 'Ride',
    stravaType: 'Ride',
    displayName: 'Cycling',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'distance',
    useStatsApi: true,
  },
  swimming: {
    id: 'swimming',
    activityType: 'Swim',
    stravaType: 'Swim',
    displayName: 'Swimming',
    metrics: { distance: true, count: true, elevation: false, time: true },
    primaryMetric: 'distance',
    useStatsApi: true,
  },
  hiking: {
    id: 'hiking',
    activityType: 'Hike',
    stravaType: 'Hike',
    displayName: 'Hiking',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'elevation',
    useStatsApi: false,
  },
  kayaking: {
    id: 'kayaking',
    activityType: 'Kayaking',
    stravaType: 'Kayaking',
    displayName: 'Kayaking',
    metrics: { distance: true, count: true, elevation: false, time: true },
    primaryMetric: 'distance',
    useStatsApi: false,
  },
  xcskiing: {
    id: 'xcskiing',
    activityType: 'NordicSki',
    stravaType: 'NordicSki',
    displayName: 'Cross Country Skiing',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'distance',
    useStatsApi: false,
  },
  snowboarding: {
    id: 'snowboarding',
    activityType: 'Snowboard',
    stravaType: 'Snowboard',
    displayName: 'Snowboarding',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'count',
    useStatsApi: false,
  },
  workouts: {
    id: 'workouts',
    activityType: 'Workout',
    stravaType: 'Workout',
    displayName: 'Workouts',
    metrics: { distance: false, count: true, elevation: false, time: true },
    primaryMetric: 'count',
    useStatsApi: false,
  },
  surfing: {
    id: 'surfing',
    activityType: 'Surfing',
    stravaType: 'Surfing',
    displayName: 'Surfing',
    metrics: { distance: false, count: true, elevation: false, time: true },
    primaryMetric: 'count',
    useStatsApi: false,
  },
  alpineskiing: {
    id: 'alpineskiing',
    activityType: 'AlpineSki',
    stravaType: 'AlpineSki',
    displayName: 'Alpine Skiing',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'count',
    useStatsApi: false,
  },
  weighttraining: {
    id: 'weighttraining',
    activityType: 'WeightTraining',
    stravaType: 'WeightTraining',
    displayName: 'Weight Training',
    metrics: { distance: false, count: true, elevation: false, time: true },
    primaryMetric: 'count',
    useStatsApi: false,
  },
}

// Helper to get activity config by Strava type
export function getActivityConfigByStravaType(
  stravaType: string,
): ActivityConfig | undefined {
  return Object.values(ACTIVITY_CONFIGS).find(
    (config) => config.stravaType === stravaType,
  )
}

// Helper to get activity config by activity type
export function getActivityConfigByType(
  activityType: ActivityType,
): ActivityConfig | undefined {
  return Object.values(ACTIVITY_CONFIGS).find(
    (config) => config.activityType === activityType,
  )
}

// Helper to convert ActivityType to Strava type string
// (For now they're the same, but this allows for future divergence)
export function activityTypeToStravaType(activityType: ActivityType): string {
  const config = getActivityConfigByType(activityType)
  return config?.stravaType ?? activityType
}

// Helper to convert multiple ActivityTypes to Strava types
export function activityTypesToStravaTypes(activityTypes: string[]): string[] {
  return activityTypes.map((type) => activityTypeToStravaType(type as ActivityType))
}

// Helper to get all visible activity configs
export function getVisibleActivityConfigs(
  visibility: Record<string, boolean>,
): ActivityConfig[] {
  return Object.values(ACTIVITY_CONFIGS).filter(
    (config) => visibility[config.id],
  )
}
