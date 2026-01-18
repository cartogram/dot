import type { ActivityTotals, ActivityGoal } from '@/types/strava'

export interface ProgressMetric {
  current: number
  goal: number
  percentage: number
  difference: number
  isAhead: boolean
  unit: string
}

/**
 * Calculate progress for a specific metric
 * Uses pace-based calculation: compares current progress to expected progress based on days elapsed
 */
function calculateProgress(
  current: number,
  goal: number,
  unit: string,
): ProgressMetric {
  const percentage = goal > 0 ? (current / goal) * 100 : 0

  // Calculate expected progress based on days elapsed in the year
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const yearEnd = new Date(now.getFullYear(), 11, 31)
  const daysInYear =
    Math.ceil(
      (yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1
  const daysElapsed = Math.ceil(
    (now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24),
  )

  // Expected progress = (goal / days in year) * days elapsed
  const expectedProgress = (goal / daysInYear) * daysElapsed

  // Difference = current progress - expected progress
  const difference = current - expectedProgress

  return {
    current,
    goal,
    percentage: Math.min(percentage, 100),
    difference,
    isAhead: difference >= 0,
    unit,
  }
}

/**
 * Calculate all progress metrics for an activity type
 */
export function calculateActivityProgress(
  totals: ActivityTotals,
  goal: ActivityGoal,
): {
  distance?: ProgressMetric
  count?: ProgressMetric
  elevation?: ProgressMetric
  time?: ProgressMetric
} {
  const progress: Record<string, ProgressMetric> = {}

  if (goal.distance !== undefined) {
    progress.distance = calculateProgress(totals.distance, goal.distance, 'km')
  }

  if (goal.count !== undefined) {
    progress.count = calculateProgress(totals.count, goal.count, 'activities')
  }

  if (goal.elevation !== undefined) {
    progress.elevation = calculateProgress(
      totals.elevation_gain,
      goal.elevation,
      'm',
    )
  }

  if (goal.time !== undefined) {
    progress.time = calculateProgress(totals.moving_time, goal.time, 'hours')
  }

  return progress
}

/**
 * Format distance in kilometers
 */
export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1)
}

/**
 * Format elevation in meters
 */
export function formatElevation(meters: number): string {
  return Math.round(meters).toLocaleString()
}

/**
 * Format time in hours and minutes
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

/**
 * Format progress difference (e.g., "10km ahead" or "5km behind")
 */
export function formatProgressDifference(metric: ProgressMetric): string {
  const absValue = Math.abs(metric.difference)
  let formattedValue: string

  switch (metric.unit) {
    case 'km':
      formattedValue = formatDistance(absValue)
      break
    case 'm':
      formattedValue = formatElevation(absValue)
      break
    case 'hours':
      formattedValue = formatTime(absValue)
      break
    default:
      formattedValue = absValue.toString()
  }

  const status = metric.isAhead ? 'ahead' : 'behind'
  return `${formattedValue}${metric.unit} ${status}`
}
