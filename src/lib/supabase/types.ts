/**
 * Supabase Database Types
 *
 * These types match the database schema defined in supabase/schema.sql
 */

import type { DashboardConfig } from '@/types/dashboard'

// =====================================================
// PROFILES
// =====================================================
export interface Profile {
  id: string // UUID matching auth.users.id
  email: string
  full_name: string | null
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface ProfileInsert {
  id: string
  email: string
  full_name?: string | null
}

export interface ProfileUpdate {
  email?: string
  full_name?: string | null
}

// =====================================================
// DATA SOURCES (Strava, etc.)
// =====================================================
export type DataSourceProvider = 'strava' | 'garmin' // Extensible for future providers

export interface StravaAthleteData {
  id: number
  username: string | null
  firstname: string | null
  lastname: string | null
  city: string | null
  state: string | null
  country: string | null
  sex: string | null
  profile: string | null
  profile_medium: string | null
  // Add other Strava athlete fields as needed
}

export interface DataSource {
  id: string // UUID
  user_id: string // UUID
  provider: DataSourceProvider
  athlete_id: number | null // Provider's athlete ID
  access_token: string
  refresh_token: string | null
  expires_at: string | null // ISO timestamp
  token_type: string
  scope: string | null
  athlete_data: StravaAthleteData | null // JSONB
  is_active: boolean
  connected_at: string // ISO timestamp
  last_synced_at: string | null // ISO timestamp
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface DataSourceInsert {
  user_id: string
  provider: DataSourceProvider
  athlete_id?: number | null
  access_token: string
  refresh_token?: string | null
  expires_at?: string | null
  token_type?: string
  scope?: string | null
  athlete_data?: StravaAthleteData | null
  is_active?: boolean
  connected_at?: string
  last_synced_at?: string | null
}

export interface DataSourceUpdate {
  access_token?: string
  refresh_token?: string | null
  expires_at?: string | null
  scope?: string | null
  athlete_data?: StravaAthleteData | null
  is_active?: boolean
  last_synced_at?: string | null
}

// =====================================================
// DASHBOARD CONFIGS
// =====================================================
export interface DashboardConfigRow {
  id: string // UUID
  user_id: string // UUID
  version: number
  config: DashboardConfig // JSONB
  is_active: boolean
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface DashboardConfigInsert {
  user_id: string
  version?: number
  config: DashboardConfig
  is_active?: boolean
}

export interface DashboardConfigUpdate {
  version?: number
  config?: DashboardConfig
  is_active?: boolean
}

// =====================================================
// DATABASE SCHEMA
// Combines all tables for type-safe queries
// =====================================================
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      data_sources: {
        Row: DataSource
        Insert: DataSourceInsert
        Update: DataSourceUpdate
      }
      dashboard_configs: {
        Row: DashboardConfigRow
        Insert: DashboardConfigInsert
        Update: DashboardConfigUpdate
      }
    }
  }
}
