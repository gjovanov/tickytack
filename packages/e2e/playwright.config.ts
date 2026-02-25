import { defineConfig, devices } from '@playwright/test'

const isRemote = !!process.env.BASE_URL

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  workers: 1,
  reporter: 'html',
  globalSetup: process.env.SKIP_SEED ? undefined : './global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(!isRemote && {
    webServer: [
      {
        command: 'bun run --env-file=../../.env --cwd ../api src/index.ts',
        port: 3001,
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
      },
      {
        command: 'bun run --cwd ../ui dev',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
      },
    ],
  }),
})
