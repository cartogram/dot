/**
 * Test Setup for Vitest Browser Mode
 *
 * This file runs before each test file in browser mode.
 * Add global setup, custom matchers, and test utilities here.
 */

import '@testing-library/dom'

// Extend Vitest matchers if needed
// import { expect } from 'vitest'
// import * as matchers from '@testing-library/jest-dom/matchers'
// expect.extend(matchers)

/**
 * Clean up after each test
 */
afterEach(() => {
  // Clear any mocks
  vi.clearAllMocks()
})
