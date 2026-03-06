import { defineConfig, devices } from '@playwright/test'

const isRemote = !!process.env.BASE_URL

export default defineConfig({
  testDir: './video',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  globalSetup: process.env.SKIP_SEED ? undefined : './global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
    launchOptions: { slowMo: 80 },
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
        reuseExistingServer: true,
        timeout: 30000,
      },
      {
        command: 'bun run --cwd ../ui dev',
        port: 3000,
        reuseExistingServer: true,
        timeout: 30000,
      },
    ],
  }),
})
