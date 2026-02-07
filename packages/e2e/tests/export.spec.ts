import { test, expect } from '../fixtures/auth.fixture'
import { navigateViaNav, waitForLoad } from '../helpers/selectors'

/** Get current week's Monday and Friday as yyyy-MM-dd strings */
function getCurrentWeekDates() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return { startDate: fmt(monday), endDate: fmt(friday) }
}

test.describe('Export', () => {
  test('export Excel file downloads via POST', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Export')
    await page.waitForURL('**/export')
    await waitForLoad(page)

    // Format defaults to Excel (.xlsx)
    await expect(page.getByText('Export Timesheet')).toBeVisible()

    // Fill date range with current week (matches seeded data)
    const { startDate, endDate } = getCurrentWeekDates()
    await page.locator('input[type="date"]').first().fill(startDate)
    await page.locator('input[type="date"]').last().fill(endDate)

    // Intercept the export request to verify it's a POST with correct body
    const requestPromise = page.waitForRequest(req =>
      req.url().includes('/export/excel') && req.method() === 'POST',
    )

    // Listen for download event before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })

    // Click Download
    await page.getByRole('button', { name: 'Download' }).click()

    // Verify request was POST with correct body
    const request = await requestPromise
    expect(request.method()).toBe('POST')
    const postBody = request.postDataJSON()
    expect(postBody.startDate).toBe(startDate)
    expect(postBody.endDate).toBe(endDate)
    expect(postBody).toHaveProperty('descriptionOverrides')

    // Verify download completes
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('timesheet')
    expect(download.suggestedFilename()).toContain('.xlsx')

    // Page should still be on export (no error redirect)
    await expect(page).toHaveURL(/\/export/)
  })

  test('export PDF file downloads via POST', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Export')
    await page.waitForURL('**/export')
    await waitForLoad(page)

    // Click the format dropdown to open it
    await page.getByLabel('Format').locator('..').click()
    // Select PDF option from the dropdown menu
    await page.getByRole('option', { name: 'PDF' }).click()

    // Fill date range with current week (matches seeded data)
    const { startDate, endDate } = getCurrentWeekDates()
    await page.locator('input[type="date"]').first().fill(startDate)
    await page.locator('input[type="date"]').last().fill(endDate)

    // Intercept the export request to verify it's a POST
    const requestPromise = page.waitForRequest(req =>
      req.url().includes('/export/pdf') && req.method() === 'POST',
    )

    // Listen for download event before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })

    // Click Download
    await page.getByRole('button', { name: 'Download' }).click()

    // Verify request was POST
    const request = await requestPromise
    expect(request.method()).toBe('POST')

    // Verify download completes
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('timesheet')
    expect(download.suggestedFilename()).toContain('.pdf')

    // Page should still be on export
    await expect(page).toHaveURL(/\/export/)
  })

  test('preview table appears when dates are filled', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Export')
    await page.waitForURL('**/export')
    await waitForLoad(page)

    // Fill date range
    const { startDate, endDate } = getCurrentWeekDates()
    await page.locator('input[type="date"]').first().fill(startDate)
    await page.locator('input[type="date"]').last().fill(endDate)

    // Wait for preview table to appear
    const dataTable = page.locator('.v-data-table')
    await expect(dataTable).toBeVisible({ timeout: 10000 })

    // Verify column header order: Date, Start, End, Hours, Project, Ticket, Summary, Description
    const headers = dataTable.locator('th')
    await expect(headers.nth(0)).toContainText('Date')
    await expect(headers.nth(1)).toContainText('Start')
    await expect(headers.nth(2)).toContainText('End')
    await expect(headers.nth(3)).toContainText('Hours')
    await expect(headers.nth(4)).toContainText('Project')
    await expect(headers.nth(5)).toContainText('Ticket')
    await expect(headers.nth(6)).toContainText('Summary')
    await expect(headers.nth(7)).toContainText('Description')

    // Verify data rows exist
    const rows = dataTable.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('description can be overridden in preview table', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Export')
    await page.waitForURL('**/export')
    await waitForLoad(page)

    // Fill date range
    const { startDate, endDate } = getCurrentWeekDates()
    await page.locator('input[type="date"]').first().fill(startDate)
    await page.locator('input[type="date"]').last().fill(endDate)

    // Wait for preview table
    const dataTable = page.locator('.v-data-table')
    await expect(dataTable).toBeVisible({ timeout: 10000 })

    // Find description input in first data row
    const firstRowDescInput = dataTable.locator('tbody tr').first().locator('input').last()
    await expect(firstRowDescInput).toBeVisible()

    // Type override text
    await firstRowDescInput.fill('My custom override description')

    // Verify value persists
    await expect(firstRowDescInput).toHaveValue('My custom override description')
  })
})
