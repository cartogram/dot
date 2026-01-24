/**
 * Server Function Mocks
 *
 * Mock responses for TanStack Start server functions.
 * These match the actual return types from src/lib/server/getUserStats.ts
 */

import { vi } from 'vitest'

/**
 * Mock profile data for a public user
 */
export const mockPublicProfile = {
  profile: {
    id: 'test-user-123',
    username: 'publicuser',
    fullName: 'Public User',
    profilePublic: true,
    createdAt: new Date('2024-01-01'),
  },
  athlete: {
    id: 12345,
    firstname: 'Test',
    lastname: 'User',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    profile: 'https://example.com/avatar.jpg',
  },
  cards: [],
  stats: {
    biggest_ride_distance: 100000,
    biggest_climb_elevation_gain: 500,
    recent_ride_totals: {
      count: 10,
      distance: 250000,
      moving_time: 36000,
      elapsed_time: 40000,
      elevation_gain: 3000,
    },
    recent_run_totals: {
      count: 5,
      distance: 50000,
      moving_time: 18000,
      elapsed_time: 20000,
      elevation_gain: 500,
    },
    recent_swim_totals: {
      count: 0,
      distance: 0,
      moving_time: 0,
      elapsed_time: 0,
      elevation_gain: 0,
    },
    ytd_ride_totals: {
      count: 50,
      distance: 1000000,
      moving_time: 144000,
      elapsed_time: 160000,
      elevation_gain: 15000,
    },
    ytd_run_totals: {
      count: 25,
      distance: 250000,
      moving_time: 90000,
      elapsed_time: 100000,
      elevation_gain: 2500,
    },
    ytd_swim_totals: {
      count: 0,
      distance: 0,
      moving_time: 0,
      elapsed_time: 0,
      elevation_gain: 0,
    },
    all_ride_totals: {
      count: 200,
      distance: 5000000,
      moving_time: 576000,
      elapsed_time: 640000,
      elevation_gain: 60000,
    },
    all_run_totals: {
      count: 100,
      distance: 1000000,
      moving_time: 360000,
      elapsed_time: 400000,
      elevation_gain: 10000,
    },
    all_swim_totals: {
      count: 0,
      distance: 0,
      moving_time: 0,
      elapsed_time: 0,
      elevation_gain: 0,
    },
  },
  activities: [],
}

/**
 * Mock response for a hidden profile
 */
export const mockHiddenProfile = {
  hidden: true as const,
  username: 'privateuser',
}

/**
 * Mock response for a user not found
 */
export const mockNotFoundProfile = {
  notFound: true as const,
}

/**
 * Create a mock for getProfileByUsername that returns different responses
 * based on the username parameter
 */
export function createGetProfileByUsernameMock() {
  return vi.fn().mockImplementation(({ data }: { data: { username: string } }) => {
    const { username } = data

    switch (username.toLowerCase()) {
      case 'publicuser':
        return Promise.resolve(mockPublicProfile)
      case 'privateuser':
        return Promise.resolve(mockHiddenProfile)
      default:
        return Promise.resolve(mockNotFoundProfile)
    }
  })
}
