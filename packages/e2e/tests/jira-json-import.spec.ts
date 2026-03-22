import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const PROJECTS_JSON = JSON.stringify([
  { id: '20001', key: 'E2E', name: 'E2E Test Project', description: 'Created via JSON import' },
  { id: '20002', key: 'QA', name: 'QA Project' },
])

const TICKETS_JSON = JSON.stringify({
  issues: [
    {
      id: '20100', key: 'E2E-100',
      fields: {
        summary: 'E2E imported ticket',
        description: 'Imported from JSON file',
        status: { name: 'Open' },
        priority: { name: 'High' },
      },
    },
    {
      id: '20101', key: 'E2E-101',
      fields: {
        summary: 'Another imported ticket',
        status: { name: 'In Progress' },
        priority: { name: 'Medium' },
      },
    },
  ],
  total: 2,
  startAt: 0,
  maxResults: 50,
})

test.describe('JIRA JSON Import', () => {
  const tmpDir = path.join('/tmp', 'tickytack-e2e-jira')

  test.beforeAll(async () => {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'projects.json'), PROJECTS_JSON)
    fs.writeFileSync(path.join(tmpDir, 'tickets.json'), TICKETS_JSON)
  })

  test.afterAll(async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Organization').fill('acme-labs')
    await page.getByLabel('Username').fill('sarahc')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL('**/timesheet', { timeout: 30000 })
  })

  test('JIRA settings page shows import buttons', async ({ page }) => {
    await page.goto('/admin/jira')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: /projects\.json/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /tickets\.json/i })).toBeVisible()
  })

  test('import projects.json creates projects', async ({ page }) => {
    await page.goto('/admin/jira')
    await page.waitForLoadState('networkidle')

    // Upload projects.json via hidden file input
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(tmpDir, 'projects.json'))

    // Wait for success message
    await expect(page.locator('.v-alert, .v-snackbar').getByText(/created/i)).toBeVisible({ timeout: 10000 })
  })

  test('import tickets.json creates tickets', async ({ page }) => {
    // First import projects so the E2E project exists
    await page.goto('/admin/jira')
    await page.waitForLoadState('networkidle')
    const projectInput = page.locator('input[type="file"]').first()
    await projectInput.setInputFiles(path.join(tmpDir, 'projects.json'))
    await page.waitForTimeout(2000)

    // Now import tickets
    const ticketInput = page.locator('input[type="file"]').last()
    await ticketInput.setInputFiles(path.join(tmpDir, 'tickets.json'))

    await expect(page.locator('.v-alert, .v-snackbar').getByText(/created/i)).toBeVisible({ timeout: 10000 })
  })

  test('VPN curl examples panel is expandable', async ({ page }) => {
    await page.goto('/admin/jira')
    await page.waitForLoadState('networkidle')

    // Click to expand the curl examples panel
    await page.getByText(/VPN.*Curl/i).click()

    // Should show curl commands
    await expect(page.getByText('curl -u')).toBeVisible()
    await expect(page.getByText('projects.json')).toBeVisible()
    await expect(page.getByText('tickets.json')).toBeVisible()
  })
})
