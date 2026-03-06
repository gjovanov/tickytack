import { test, expect } from '../fixtures/auth.fixture'
import { navigateViaNav, waitForLoad, waitForSnackbar } from '../helpers/selectors'
import path from 'path'

/** Get current week's Monday and Friday as yyyy-MM-dd strings */
function getCurrentWeekDates() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return { startDate: fmt(monday), endDate: fmt(friday) }
}

test.describe('Import', () => {
  test('import page is accessible via navigation', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Import')
    await page.waitForURL('**/import')
    await waitForLoad(page)

    await expect(page.getByText('Import Timesheet')).toBeVisible()
    await expect(page.locator('.v-file-input')).toBeVisible()
  })

  test('export → download → import round-trip', async ({ authenticatedPage: page }) => {
    // Step 1: Export an Excel file
    await navigateViaNav(page, 'Export')
    await page.waitForURL('**/export')
    await waitForLoad(page)

    const { startDate, endDate } = getCurrentWeekDates()
    await page.locator('input[type="date"]').first().fill(startDate)
    await page.locator('input[type="date"]').last().fill(endDate)

    // Wait for preview to load
    await page.locator('.v-data-table').waitFor({ state: 'visible', timeout: 10000 })

    // Download the file
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.getByRole('button', { name: 'Download' }).click()
    const download = await downloadPromise

    // Save the downloaded file
    const downloadPath = path.join('/tmp', download.suggestedFilename())
    await download.saveAs(downloadPath)

    // Step 2: Navigate to Import
    await navigateViaNav(page, 'Import')
    await page.waitForURL('**/import')
    await waitForLoad(page)

    // Step 3: Upload the exported file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(downloadPath)

    // Step 4: Click Preview
    await page.getByRole('button', { name: 'Preview' }).click()

    // Step 5: Verify preview data appears
    await page.locator('.v-alert').first().waitFor({ state: 'visible', timeout: 10000 })

    // Period should be detected
    await expect(page.getByText('Period detected')).toBeVisible()

    // Preview table should show entries
    const dataTable = page.locator('.v-data-table')
    await expect(dataTable).toBeVisible({ timeout: 5000 })

    // Replace checkbox should be visible
    await expect(page.getByLabel('Replace existing time entries')).toBeVisible()
  })

  test('JIRA settings page is accessible', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'JIRA')
    await page.waitForURL('**/admin/jira')
    await waitForLoad(page)

    await expect(page.getByText('JIRA Integration')).toBeVisible()
    await expect(page.getByLabel('JIRA URL')).toBeVisible()
    await expect(page.getByLabel('JIRA Email')).toBeVisible()
    await expect(page.getByLabel('API Token')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Test Connection' })).toBeVisible()
  })
})
