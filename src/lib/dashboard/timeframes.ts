import type { TimeFrame } from '@/types/dashboard'
import type { StravaActivity } from '@/types/strava'

/**
 * Get the start date for a given time frame
 */
export function getTimeFrameStartDate(
  timeFrame: TimeFrame,
  customRange?: { start: string; end: string }
): Date {
  const now = new Date()

  switch (timeFrame) {
    case 'day': {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      dayStart.setHours(0, 0, 0, 0)
      return dayStart
    }

    case 'week': {
      const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust when day is Sunday
      const weekStart = new Date(now.setDate(diff))
      weekStart.setHours(0, 0, 0, 0)
      return weekStart
    }

    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      monthStart.setHours(0, 0, 0, 0)
      return monthStart
    }

    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1)
      yearStart.setHours(0, 0, 0, 0)
      return yearStart
    }

    case 'custom': {
      if (!customRange) {
        throw new Error('Custom time frame requires customRange parameter')
      }
      return new Date(customRange.start)
    }

    case 'all': {
      // Return a very old date for "all time"
      return new Date(2000, 0, 1)
    }

    default:
      throw new Error(`Unknown time frame: ${timeFrame}`)
  }
}

/**
 * Get the end date for a given time frame
 */
export function getTimeFrameEndDate(
  timeFrame: TimeFrame,
  customRange?: { start: string; end: string }
): Date {
  if (timeFrame === 'custom' && customRange) {
    return new Date(customRange.end)
  }

  // For all other time frames, end date is now
  return new Date()
}

/**
 * Filter activities by time frame
 */
export function filterActivitiesByTimeFrame(
  activities: StravaActivity[] | undefined,
  timeFrame: TimeFrame,
  customRange?: { start: string; end: string }
): StravaActivity[] {
  if (!activities) return []

  const startDate = getTimeFrameStartDate(timeFrame, customRange)
  const endDate = getTimeFrameEndDate(timeFrame, customRange)

  return activities
    .filter(activity => {
      const activityDate = new Date(activity.start_date)
      return activityDate >= startDate && activityDate <= endDate
    })
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
}

/**
 * Get a human-readable description of a time frame
 */
export function getTimeFrameDescription(
  timeFrame: TimeFrame,
  customRange?: { start: string; end: string }
): string {
  switch (timeFrame) {
    case 'day':
      return 'Today'
    case 'week':
      return 'This Week'
    case 'month':
      return 'This Month'
    case 'year':
      return 'This Year'
    case 'all':
      return 'All Time'
    case 'custom':
      if (customRange) {
        const start = new Date(customRange.start).toLocaleDateString()
        const end = new Date(customRange.end).toLocaleDateString()
        return `${start} - ${end}`
      }
      return 'Custom Range'
    default:
      return 'Unknown'
  }
}

/**
 * Calculate the number of days in a time frame
 */
export function getTimeFrameDays(
  timeFrame: TimeFrame,
  customRange?: { start: string; end: string }
): number {
  const startDate = getTimeFrameStartDate(timeFrame, customRange)
  const endDate = getTimeFrameEndDate(timeFrame, customRange)

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}
