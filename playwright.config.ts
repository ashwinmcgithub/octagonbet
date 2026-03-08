import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 90000,           // 90s per test (Neon wakeup + Vercel cold start)
  globalTimeout: 1200000,   // 20 min total
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL || 'https://octagonbet.vercel.app',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 45000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
