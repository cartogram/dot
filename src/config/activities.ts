export interface ActivityConfig {
  id: string // e.g., 'running', 'cycling'
  stravaType: string // Strava API type: 'Run', 'Ride', etc.
  displayName: string // UI label: 'Running', 'Cycling'
  icon?: string // Optional icon identifier
  metrics: {
    distance: boolean // Track distance goals
    count: boolean // Track activity count
    elevation: boolean // Track elevation goals
    time: boolean // Track time goals
  }
  primaryMetric: 'distance' | 'count' | 'time' | 'elevation' // Main progress indicator
  useStatsApi: boolean // true for Ride/Run/Swim, false for others
}

export const ACTIVITY_CONFIGS: Record<string, ActivityConfig> = {
  running: {
    id: 'running',
    stravaType: 'Run',
    displayName: 'Running',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'distance',
    useStatsApi: true,
  },
  cycling: {
    id: 'cycling',
    stravaType: 'Ride',
    displayName: 'Cycling',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'distance',
    useStatsApi: true,
  },
  swimming: {
    id: 'swimming',
    stravaType: 'Swim',
    displayName: 'Swimming',
    metrics: { distance: true, count: true, elevation: false, time: true },
    primaryMetric: 'distance',
    useStatsApi: true,
  },
  hiking: {
    id: 'hiking',
    stravaType: 'Hike',
    displayName: 'Hiking',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'elevation',
    useStatsApi: false,
  },
  kayaking: {
    id: 'kayaking',
    stravaType: 'Kayaking',
    displayName: 'Kayaking',
    metrics: { distance: true, count: true, elevation: false, time: true },
    primaryMetric: 'distance',
    useStatsApi: false,
  },
  xcskiing: {
    id: 'xcskiing',
    stravaType: 'NordicSki',
    displayName: 'Cross Country Skiing',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'distance',
    useStatsApi: false,
  },
  snowboarding: {
    id: 'snowboarding',
    stravaType: 'Snowboard',
    displayName: 'Snowboarding',
    metrics: { distance: true, count: true, elevation: true, time: true },
    primaryMetric: 'count',
    useStatsApi: false,
  },
  workouts: {
    id: 'workouts',
    stravaType: 'Workout',
    displayName: 'Workouts',
    metrics: { distance: false, count: true, elevation: false, time: true },
    primaryMetric: 'count',
    useStatsApi: false,
  },
  surfing: {
    id: 'surfing',
    stravaType: 'Surfing',
    displayName: 'Surfing',
    metrics: { distance: false, count: true, elevation: false, time: true },
    primaryMetric: 'count',
    useStatsApi: false,
  },
  alpineskiing: {
    id: 'alpineskiing',
    stravaType: 'AlpineSki',
    displayName: 'Alpine Skiing',
    metrics: { distance: true, count: true, elevation: true, time: true },
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

// Helper to get all visible activity configs
export function getVisibleActivityConfigs(
  visibility: Record<string, boolean>,
): ActivityConfig[] {
  return Object.values(ACTIVITY_CONFIGS).filter(
    (config) => visibility[config.id],
  )
}
