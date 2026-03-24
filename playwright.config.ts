import { defineConfig, devices } from '@playwright/test'

// Dedicated port for Playwright so it never fights `npm run dev -p 4000`
const port = process.env.PLAYWRIGHT_PORT || '4173'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- -p ${port}`,
    url: baseURL,
    // Reuse only if you already started dev on the same PLAYWRIGHT_PORT
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
