import type { ActivityTotals, ActivityGoal } from '@/types/strava'
import type { TimeFrame } from '@/types/dashboard'
import { getTimeFrameStartDate } from '@/lib/dashboard/timeframes'
export {secondsToHours} from 'date-fns'

export interface ProgressMetric {
  current: number // Elapsed progress (in display units)
  goal: number // Goal total (in display units)
  remainder: number // What's left to do (goal - current, in display units)
  dailyPace: number // Daily amount needed to finish (in display units)
  percentage: number // Completion percentage
  unit: string // Display unit ('km', 'hours', 'm', 'activities')
  daysRemaining: number // Days left in timeframe
  expectedProgress: number // Expected progress based on days elapsed (in display units)
  behindPlan: number // How far behind/ahead of plan (negative = behind, positive = ahead, in display units)
}

/**
 * Get the actual end date for a timeframe (end of period, not "now")
 */
function getTimeFramePeriodEnd(
  timeFrame: TimeFrame,
  customRange?: { start: string; end: string },
): Date {
  if (timeFrame === 'custom' && customRange) {
    return new Date(customRange.end)
  }

  const now = new Date()

  switch (timeFrame) {
    case 'day': {
      // End of today
      const dayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      )
      dayEnd.setHours(23, 59, 59, 999)
      return dayEnd
    }

    case 'week': {
      // End of week (Sunday 23:59:59)
      const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() + daysUntilSunday)
      weekEnd.setHours(23, 59, 59, 999)
      return weekEnd
    }

    case 'month': {
      // End of current month
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      monthEnd.setHours(23, 59, 59, 999)
      return monthEnd
    }

    case 'year': {
      // End of current year
      const yearEnd = new Date(now.getFullYear(), 11, 31)
      yearEnd.setHours(23, 59, 59, 999)
      return yearEnd
    }

    case 'all': {
      // Far future date
      return new Date(2100, 0, 1)
    }

    default:
      return new Date()
  }
}

/**
 * Calculate days elapsed and remaining in a timeframe
 */
function calculateTimeFrameDays(
  timeFrame: TimeFrame,
  customRange?: { start: string; end: string },
): { daysElapsed: number; daysRemaining: number; totalDays: number } {
  const startDate = getTimeFrameStartDate(timeFrame, customRange)
  const periodEnd = getTimeFramePeriodEnd(timeFrame, customRange)
  const now = new Date()

  // Calculate total days in timeframe
  const totalDays = Math.ceil(
    (periodEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  ) + 1

  // Calculate days elapsed (from start to now, clamped to timeframe)
  const elapsedMs = Math.max(0, now.getTime() - startDate.getTime())
  const daysElapsed = Math.min(
    Math.ceil(elapsedMs / (1000 * 60 * 60 * 24)),
    totalDays,
  )

  // Calculate days remaining (from now to end of period)
  const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime())
  const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))

  return {
    daysElapsed: Math.max(0, daysElapsed),
    daysRemaining: Math.max(0, daysRemaining),
    totalDays,
  }
}

/**
 * Calculate progress for a specific metric
 * Focuses on elapsed progress, remainder, and daily pace needed
 */
function calculateProgress(
  current: number,
  goal: number,
  unit: string,
  timeFrame: TimeFrame,
  customRange?: { start: string; end: string },
): ProgressMetric {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0
  const remainder = Math.max(0, goal - current)
  const { daysElapsed, daysRemaining, totalDays } = calculateTimeFrameDays(
    timeFrame,
    customRange,
  )

  // Calculate expected progress based on days elapsed
  // Expected = (goal / total days) * days elapsed
  const expectedProgress =
    totalDays > 0 ? (goal / totalDays) * daysElapsed : 0

  // Calculate how far behind/ahead of plan
  // Negative = behind, positive = ahead
  const behindPlan = current - expectedProgress

  // Calculate daily pace needed
  let dailyPace = 0
  if (current >= goal) {
    // Goal already met or exceeded
    dailyPace = 0
  } else if (daysRemaining <= 0) {
    // No days remaining - all remaining needed today
    dailyPace = remainder
  } else {
    // Normal case: distribute remainder across remaining days
    dailyPace = remainder / daysRemaining
  }

  return {
    current,
    goal,
    remainder,
    dailyPace,
    percentage,
    unit,
    daysRemaining,
    expectedProgress,
    behindPlan,
  }
}

/**
 * Calculate all progress metrics for an activity type
 */
export function calculateActivityProgress(
  totals: ActivityTotals,
  goal: ActivityGoal,
  timeFrame: TimeFrame,
  customRange?: { start: string; end: string },
): {
  distance?: ProgressMetric
  count?: ProgressMetric
  elevation?: ProgressMetric
  time?: ProgressMetric
} {
  const progress: Record<string, ProgressMetric> = {}

  if (goal.distance !== undefined) {
    // Convert meters to kilometers for distance calculations
    const currentKm = totals.distance / 1000
    const goalKm = goal.distance / 1000
    progress.distance = calculateProgress(
      currentKm,
      goalKm,
      'km',
      timeFrame,
      customRange,
    )
  }

  if (goal.count !== undefined) {
    progress.count = calculateProgress(
      totals.count,
      goal.count,
      'activities',
      timeFrame,
      customRange,
    )
  }

  if (goal.elevation !== undefined) {
    progress.elevation = calculateProgress(
      totals.elevation_gain,
      goal.elevation,
      'm',
      timeFrame,
      customRange,
    )
  }

  if (goal.time !== undefined) {
    // Convert seconds to hours for time calculations
    const currentHours = totals.moving_time / 3600
    const goalHours = goal.time / 3600
    progress.time = calculateProgress(
      currentHours,
      goalHours,
      'hours',
      timeFrame,
      customRange,
    )
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
 * Format a value based on its unit
 */
function formatValue(value: number, unit: string): string {
  switch (unit) {
    case 'km':
      return formatDistance(value * 1000) // Convert km to meters for formatDistance
    case 'm':
      return formatElevation(value)
    case 'hours':
      return formatTime(value * 3600) // Convert hours to seconds for formatTime
    default:
      return value.toFixed(1)
  }
}

/**
 * Format daily pace (e.g., "10km/day", "1h/day")
 */
export function formatDailyPace(metric: ProgressMetric): string {
  const formattedValue = formatValue(metric.dailyPace, metric.unit)
  
  // For time, formatTime already includes units, so don't append the unit again
  if (metric.unit === 'hours') {
    return `${formattedValue}/day`
  }
  return `${formattedValue}${metric.unit}/day`
}

/**
 * Format goal remainder (what's left to do)
 */
export function formatRemainder(metric: ProgressMetric): string {
  return formatValue(metric.remainder, metric.unit)
}

/**
 * Format current progress (elapsed)
 */
export function formatCurrent(metric: ProgressMetric): string {
  return formatValue(metric.current, metric.unit)
}

/**
 * Format goal total
 */
export function formatGoal(metric: ProgressMetric): string {
  return formatValue(metric.goal, metric.unit)
}

/**
 * Format behind/ahead of plan (e.g., "5km behind" or "2h ahead")
 */
export function formatBehindPlan(metric: ProgressMetric): string {
  const absValue = Math.abs(metric.behindPlan)
  const formattedValue = formatValue(absValue, metric.unit)
  const status = metric.behindPlan < 0 ? 'behind' : metric.behindPlan > 0 ? 'ahead' : 'on track'

  // For time, formatTime already includes units
  if (metric.unit === 'hours') {
    if (status === 'on track') {
      return status
    }
    return `${formattedValue} ${status}`
  }

  if (status === 'on track') {
    return status
  }
  return `${formattedValue}${metric.unit} ${status}`
}

/**
 * Format complete progress summary (current / goal)
 */
export function formatProgressSummary(metric: ProgressMetric): string {
  const currentFormatted = formatCurrent(metric)
  const goalFormatted = formatGoal(metric)
  
  // For time, formatTime already includes units
  if (metric.unit === 'hours') {
    return `${currentFormatted} / ${goalFormatted} (${metric.percentage.toFixed(0)}%)`
  }
  
  return `${currentFormatted} ${metric.unit} of ${goalFormatted} ${metric.unit}`
}
