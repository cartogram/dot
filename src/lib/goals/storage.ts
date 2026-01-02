import type { YearlyGoals } from '@/types/strava'

const GOALS_STORAGE_KEY = 'yearly_goals'

export function saveGoals(goals: YearlyGoals): void {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
}

export function getStoredGoals(): YearlyGoals {
  const stored = localStorage.getItem(GOALS_STORAGE_KEY)
  if (!stored) return {}

  try {
    return JSON.parse(stored)
  } catch {
    return {}
  }
}

export function clearGoals(): void {
  localStorage.removeItem(GOALS_STORAGE_KEY)
}
