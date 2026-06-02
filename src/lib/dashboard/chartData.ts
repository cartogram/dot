import type { StravaActivity } from '@/types/strava'
import type { TimeFrame, Metric } from '@/types/dashboard'
import { getTimeFrameStartDate } from './timeframes'
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
  parseISO,
  isAfter,
  isBefore,
  differenceInDays,
  addDays,
  startOfDay,
  endOfDay,
} from 'date-fns'

export interface BurnUpPoint {
  date: string
  dayIndex: number
  actual?: number
  target: number
}

export interface WeeklyVolumePoint {
  label: string
  value: number
  startDate: Date
}

export interface ContributionPoint {
  name: string
  value: number
  percentage: number
}

export interface HeatmapPoint {
  date: string
  value: number
  count: number
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
}

/**
 * Get the value of an activity for a given metric
 */
export function getActivityMetricValue(activity: StravaActivity, metric: Metric): number {
  switch (metric) {
    case 'distance':
      return activity.distance / 1000 // Convert meters to km
    case 'time':
      return activity.moving_time / 3600 // Convert seconds to hours
    case 'elevation':
      return activity.total_elevation_gain // Keep meters
    case 'count':
      return 1
    default:
      return 0
  }
}

/**
 * Get the calendar end date for a given timeframe
 */
export function getTimeFramePeriodEnd(timeFrame: TimeFrame): Date {
  const now = new Date()
  switch (timeFrame) {
    case 'week':
      return endOfWeek(now, { weekStartsOn: 1 }) // End of current week (Sunday)
    case 'month':
      return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) // End of current month
    case 'year':
    case 'ytd':
      return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) // End of current year
    default:
      return now
  }
}

/**
 * Generates data points for the cumulative Burn-Up chart
 */
export function getBurnUpData(
  activities: StravaActivity[],
  timeFrame: TimeFrame,
  goal: number | null | undefined,
  metric: Metric
): BurnUpPoint[] {
  const startDate = getTimeFrameStartDate(timeFrame)
  const endDate = getTimeFramePeriodEnd(timeFrame)
  const now = startOfDay(new Date())

  const totalDays = differenceInDays(endDate, startDate) + 1
  const points: BurnUpPoint[] = []

  const targetGoal = goal || 0

  // Filter and sort activities chronologically
  const sortedActivities = [...activities]
    .filter((a) => {
      const date = parseISO(a.start_date)
      return (date >= startDate || date.getTime() >= startDate.getTime()) && 
             (date <= endDate || date.getTime() <= endDate.getTime())
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  let cumulativeProgress = 0
  let activityIdx = 0

  // We iterate day-by-day
  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(startDate, i)
    const currentDateEnd = endOfDay(currentDate)

    // Add up all activities that happened on or before this day (and not already processed)
    while (
      activityIdx < sortedActivities.length &&
      new Date(sortedActivities[activityIdx].start_date).getTime() <= currentDateEnd.getTime()
    ) {
      cumulativeProgress += getActivityMetricValue(sortedActivities[activityIdx], metric)
      activityIdx++
    }

    // Target pace line is linear from start of timeframe to end
    const target = totalDays > 1 ? (i / (totalDays - 1)) * targetGoal : targetGoal

    const isFuture = isAfter(startOfDay(currentDate), now)

    points.push({
      date: format(currentDate, 'MMM d'),
      dayIndex: i,
      // If the day is in the future, don't supply actual cumulative progress (line stops at today)
      actual: isFuture ? undefined : cumulativeProgress,
      target: Number(target.toFixed(1)),
    })
  }

  return points
}

/**
 * Aggregates activities over the last 12 weeks (Monday-Sunday)
 */
export function getWeeklyVolumeData(
  activities: StravaActivity[],
  metric: Metric
): WeeklyVolumePoint[] {
  const points: WeeklyVolumePoint[] = []
  const now = new Date()
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })

  // Construct 12 weeks back-to-front
  for (let i = 11; i >= 0; i--) {
    const weekStart = subWeeks(thisWeekStart, i)
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

    // Filter activities in this week
    const weekActivities = activities.filter((a) => {
      const date = parseISO(a.start_date)
      return date >= weekStart && date <= weekEnd
    })

    const totalVolume = weekActivities.reduce(
      (sum, act) => sum + getActivityMetricValue(act, metric),
      0
    )

    points.push({
      label: format(weekStart, 'MMM d'),
      value: Number(totalVolume.toFixed(1)),
      startDate: weekStart,
    })
  }

  return points
}

/**
 * Groups and sums progress by activity type to show contribution percentages
 */
export function getActivityContribution(
  activities: StravaActivity[],
  metric: Metric
): ContributionPoint[] {
  const totalsByType: Record<string, number> = {}

  activities.forEach((activity) => {
    const value = getActivityMetricValue(activity, metric)
    const type = activity.type || 'Other'
    totalsByType[type] = (totalsByType[type] || 0) + value
  })

  const totalSum = Object.values(totalsByType).reduce((a, b) => a + b, 0)

  if (totalSum === 0) {
    return Object.entries(totalsByType).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(1)),
      percentage: 0,
    }))
  }

  return Object.entries(totalsByType)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(1)),
      percentage: Number(((value / totalSum) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Generates an array of all days in the current year YTD with activity values for the Heatmap
 */
export function getHeatmapData(
  activities: StravaActivity[],
  metric: Metric = 'count'
): HeatmapPoint[] {
  const points: HeatmapPoint[] = []
  const year = new Date().getFullYear()
  const startDate = new Date(year, 0, 1) // Jan 1
  const now = new Date()
  const endDate = new Date(year, 11, 31) // Dec 31
  
  const totalDays = differenceInDays(endDate, startDate) + 1

  // Create a fast lookup map for activity metrics by date string (YYYY-MM-DD)
  const activityMap: Record<string, { value: number; count: number }> = {}

  activities.forEach((activity) => {
    const localDate = activity.start_date_local || activity.start_date
    const dateStr = localDate.split('T')[0] // YYYY-MM-DD
    const val = getActivityMetricValue(activity, metric)
    
    if (!activityMap[dateStr]) {
      activityMap[dateStr] = { value: 0, count: 0 }
    }
    activityMap[dateStr].value += val
    activityMap[dateStr].count += 1
  })

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(startDate, i)
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.

    const data = activityMap[dateStr] || { value: 0, count: 0 }

    points.push({
      date: dateStr,
      value: Number(data.value.toFixed(1)),
      count: data.count,
      dayOfWeek,
    })
  }

  return points
}
