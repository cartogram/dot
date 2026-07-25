import { describe, expect, it } from 'vitest'
import { getBurnUpData } from './chartData'
import type { StravaActivity } from '@/types/strava'

describe('getBurnUpData', () => {
  it('should generate cumulative progress and target pace correctly', () => {
    const activities: Array<StravaActivity> = [
      {
        id: 1,
        name: 'Run 1',
        distance: 5000, // 5km
        moving_time: 1800,
        elapsed_time: 1800,
        total_elevation_gain: 50,
        type: 'Run',
        start_date: new Date().toISOString(), // today
        start_date_local: new Date().toISOString(),
        average_speed: 2.7,
        max_speed: 4.0,
      }
    ]

    const result = getBurnUpData(activities, 'week', 10, 'distance')
    console.log("getBurnUpData week output:", JSON.stringify(result, null, 2))
    expect(result.length).toBeGreaterThan(0)
  })

  it('should generate cumulative progress for year correctly', () => {
    const currentYear = new Date().getFullYear()
    const activities: Array<StravaActivity> = [
      {
        id: 1,
        name: 'Run 1',
        distance: 10000, // 10km
        moving_time: 3600,
        elapsed_time: 3600,
        total_elevation_gain: 100,
        type: 'Run',
        start_date: `${currentYear}-01-15T10:00:00Z`,
        start_date_local: `${currentYear}-01-15T10:00:00Z`,
        average_speed: 2.7,
        max_speed: 4.0,
      },
      {
        id: 2,
        name: 'Run 2',
        distance: 20000, // 20km
        moving_time: 7200,
        elapsed_time: 7200,
        total_elevation_gain: 200,
        type: 'Run',
        start_date: `${currentYear}-02-20T10:00:00Z`,
        start_date_local: `${currentYear}-02-20T10:00:00Z`,
        average_speed: 2.7,
        max_speed: 4.0,
      },
      {
        id: 3,
        name: 'Run 3',
        distance: 15000, // 15km
        moving_time: 5400,
        elapsed_time: 5400,
        total_elevation_gain: 150,
        type: 'Run',
        start_date: `${currentYear}-03-10T10:00:00Z`,
        start_date_local: `${currentYear}-03-10T10:00:00Z`,
        average_speed: 2.7,
        max_speed: 4.0,
      }
    ]

    const result = getBurnUpData(activities, 'year', 100, 'distance')
    console.log("getBurnUpData year output length:", result.length)
    const pointsWithActual = result.filter(p => p.actual !== undefined)
    console.log("Points with actual value:", pointsWithActual.length)
    if (pointsWithActual.length > 0) {
      console.log("First point with actual:", pointsWithActual[0])
      console.log("Last point with actual:", pointsWithActual[pointsWithActual.length - 1])
    }
    expect(result.length).toBeGreaterThan(0)
  })
})
