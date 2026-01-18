import type { YearlyGoals, LegacyYearlyGoals } from '@/types/strava'

const GOALS_STORAGE_KEY = 'yearly_goals'

/**
 * Migrates legacy goal format (rides/runs/swims) to new dynamic format
 */
function migrateFromLegacyFormat(legacy: LegacyYearlyGoals): YearlyGoals {
  const activities: YearlyGoals['activities'] = {}
  const visibility: YearlyGoals['visibility'] = {}

  // Migrate rides -> cycling
  if (legacy.rides) {
    activities.cycling = legacy.rides
  }
  if (legacy.visibility?.rides !== undefined) {
    visibility.cycling = legacy.visibility.rides
  }

  // Migrate runs -> running
  if (legacy.runs) {
    activities.running = legacy.runs
  }
  if (legacy.visibility?.runs !== undefined) {
    visibility.running = legacy.visibility.runs
  }

  // Migrate swims -> swimming
  if (legacy.swims) {
    activities.swimming = legacy.swims
  }
  if (legacy.visibility?.swims !== undefined) {
    visibility.swimming = legacy.visibility.swims
  }

  return { activities, visibility, combined: {} }
}

/**
 * Checks if the stored goals are in legacy format
 */
function isLegacyFormat(goals: any): goals is LegacyYearlyGoals {
  return (
    'rides' in goals ||
    'runs' in goals ||
    'swims' in goals ||
    (goals.visibility &&
      ('rides' in goals.visibility ||
        'runs' in goals.visibility ||
        'swims' in goals.visibility))
  )
}

export function saveGoals(goals: YearlyGoals): void {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
}

export function getStoredGoals(): YearlyGoals {
  const stored = localStorage.getItem(GOALS_STORAGE_KEY)

  // Return default empty structure if nothing stored
  if (!stored) {
    return { activities: {}, visibility: {}, combined: {} }
  }

  try {
    const parsed = JSON.parse(stored)

    // Check if legacy format and migrate
    if (isLegacyFormat(parsed)) {
      const migrated = migrateFromLegacyFormat(parsed)
      // Save migrated format back to storage
      saveGoals(migrated)
      return migrated
    }

    // Ensure combined field exists (for backward compatibility)
    const goals = parsed as YearlyGoals
    if (!goals.combined) {
      goals.combined = {}
    }

    return goals
  } catch {
    return { activities: {}, visibility: {}, combined: {} }
  }
}

export function clearGoals(): void {
  localStorage.removeItem(GOALS_STORAGE_KEY)
}
