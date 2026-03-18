import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 60000,
  globalTimeout: 2400000,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  // Auto-start Next.js dev server when running locally
  webServer: BASE_URL.includes('localhost') ? {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 60000,
  } : undefined,

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 20000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
