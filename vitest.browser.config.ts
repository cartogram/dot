import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [
    react(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [
        {
          browser: 'chromium',
        },
      ],
      // Disable screenshots - they render as white in headless mode
      screenshotFailures: false,
      // https://vitest.dev/guide/browser/playwright
    },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.browser.test.ts', 'src/**/*.browser.test.tsx'],
    // Suppress React act() warnings - these are expected in browser mode
    // All state updates are properly handled by userEvent
    onConsoleLog(log) {
      if (log.includes('act(...)') || log.includes('wrapped in act')) {
        return false
      }
    },
  },
})
