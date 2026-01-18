import type { StravaActivity, ActivityTotals } from '@/types/strava'

/**
 * Aggregates activities by type into ActivityTotals format
 * Used for activity types not supported by Strava Stats API
 *
 * @param activities - Array of all activities
 * @param activityType - Strava type string (e.g., 'Run', 'Hike', 'Workout')
 * @returns ActivityTotals with aggregated metrics
 */
export function aggregateActivities(
  activities: StravaActivity[],
  activityType: string,
): ActivityTotals {
  // Fast filter + reduce in single pass
  return activities
    .filter((activity) => activity.type === activityType)
    .reduce(
      (totals, activity) => ({
        count: totals.count + 1,
        distance: totals.distance + activity.distance,
        moving_time: totals.moving_time + activity.moving_time,
        elapsed_time: totals.elapsed_time + activity.elapsed_time,
        elevation_gain: totals.elevation_gain + activity.total_elevation_gain,
      }),
      {
        count: 0,
        distance: 0,
        moving_time: 0,
        elapsed_time: 0,
        elevation_gain: 0,
      } as ActivityTotals,
    )
}

/**
 * Aggregates all activities grouped by type
 * Useful for getting totals for multiple activity types at once
 *
 * @param activities - Array of all activities
 * @param activityTypes - Array of Strava type strings to aggregate
 * @returns Record mapping activity type to its totals
 */
export function aggregateActivitiesByType(
  activities: StravaActivity[],
  activityTypes: string[],
): Record<string, ActivityTotals> {
  const result: Record<string, ActivityTotals> = {}

  for (const type of activityTypes) {
    result[type] = aggregateActivities(activities, type)
  }

  return result
}
