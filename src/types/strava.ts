// OAuth types
export interface StravaTokenResponse {
  token_type: 'Bearer'
  expires_at: number // Unix timestamp
  expires_in: number // Seconds (21600 = 6 hours)
  refresh_token: string
  access_token: string
  athlete: StravaAthlete
}

export interface StravaAthlete {
  id: number
  username: string
  firstname: string
  lastname: string
  profile: string // URL to profile image
  city: string
  state: string
  country: string
}

// Stats types
export interface StravaStats {
  biggest_ride_distance: number
  biggest_climb_elevation_gain: number
  recent_ride_totals: ActivityTotals
  recent_run_totals: ActivityTotals
  recent_swim_totals: ActivityTotals
  ytd_ride_totals: ActivityTotals
  ytd_run_totals: ActivityTotals
  ytd_swim_totals: ActivityTotals
  all_ride_totals: ActivityTotals
  all_run_totals: ActivityTotals
  all_swim_totals: ActivityTotals
}

export interface ActivityTotals {
  count: number
  distance: number // meters
  moving_time: number // seconds
  elapsed_time: number // seconds
  elevation_gain: number // meters
}

// Token storage
export interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: StravaAthlete
}

// Goal tracking
export interface YearlyGoals {
  rides?: ActivityGoal
  runs?: ActivityGoal
  swims?: ActivityGoal
  visibility?: ActivityVisibility
}

export interface ActivityGoal {
  distance?: number // meters
  count?: number
  elevation?: number // meters
  time?: number // seconds
}

export interface ActivityVisibility {
  rides: boolean
  runs: boolean
  swims: boolean
}

// Activity types
export interface StravaActivity {
  id: number
  name: string
  distance: number // meters
  moving_time: number // seconds
  elapsed_time: number // seconds
  total_elevation_gain: number // meters
  type: string // 'Run', 'Ride', 'Swim', etc.
  start_date: string // ISO 8601 formatted date
  start_date_local: string
  average_speed: number // meters per second
  max_speed: number // meters per second
}
