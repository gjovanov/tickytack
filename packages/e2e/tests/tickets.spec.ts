import { test, expect } from '../fixtures/auth.fixture'
import { navigateViaNav, waitForLoad } from '../helpers/selectors'

test.describe('Tickets', () => {
  test('list tickets for project', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Tickets')
    await page.waitForURL('**/admin/tickets')
    await waitForLoad(page)

    // Select a project from multi-select dropdown (use force for Vuetify v-select)
    await page.getByRole('combobox', { name: 'Project' }).click({ force: true })
    await page.getByRole('option', { name: /PCLASS/ }).click()
    await page.keyboard.press('Escape')

    // Wait for tickets to load
    await page.waitForLoadState('networkidle')

    // Table should show seeded tickets for PCLASS
    await expect(page.getByText('PCLASS-101')).toBeVisible()
    await expect(page.getByText('PCLASS-102')).toBeVisible()
  })

  test('create ticket', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Tickets')
    await page.waitForURL('**/admin/tickets')
    await waitForLoad(page)

    // Select project first (exactly one for create)
    await page.getByRole('combobox', { name: 'Project' }).click({ force: true })
    await page.getByRole('option', { name: /PCLASS/ }).click()
    await page.keyboard.press('Escape')
    await page.waitForLoadState('networkidle')

    // Click Create Ticket button
    await page.getByRole('button', { name: 'Create Ticket' }).click()

    const dialog = page.locator('.v-dialog')
    await expect(dialog).toBeVisible()

    // Fill ticket form
    await dialog.getByLabel('Summary').fill('New test ticket for E2E')
    await dialog.getByLabel('Estimated Hours').fill('4')

    // Save
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden({ timeout: 5000 })

    // Verify new ticket appears
    await expect(page.getByText('New test ticket for E2E').first()).toBeVisible()
  })

  test('edit ticket status', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Tickets')
    await page.waitForURL('**/admin/tickets')
    await waitForLoad(page)

    // Select project
    await page.getByRole('combobox', { name: 'Project' }).click({ force: true })
    await page.getByRole('option', { name: /PCLASS/ }).click()
    await page.keyboard.press('Escape')
    await page.waitForLoadState('networkidle')

    // Click edit on first ticket
    const editBtn = page.locator('.v-data-table tbody tr').first().locator('button:has(.mdi-pencil)').first()
    await editBtn.click()

    const dialog = page.locator('.v-dialog')
    await expect(dialog).toBeVisible()

    // Change status to done (use force for v-select)
    await dialog.getByLabel('Status').click({ force: true })
    await page.getByRole('option', { name: 'done' }).click()

    // Fill estimated hours to avoid null validation error
    const hoursField = dialog.getByLabel('Estimated Hours')
    await hoursField.clear()
    await hoursField.fill('2')

    // Save
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden({ timeout: 5000 })

    // Verify the status chip shows "Done"
    await expect(page.locator('.v-data-table').getByText('Done').first()).toBeVisible()
  })

  test('multi-select projects with select all / deselect all', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Tickets')
    await page.waitForURL('**/admin/tickets')
    await waitForLoad(page)

    // Helper to open the project dropdown
    const openDropdown = async () => {
      await page.locator('.v-select .v-field__append-inner').first().click()
      await page.waitForTimeout(300)
    }

    // Open the project multi-select dropdown
    await openDropdown()

    // Click "Select All"
    await page.getByText('Select All').click()
    await page.keyboard.press('Escape')
    await page.waitForLoadState('networkidle')

    // Table should have tickets from all projects (PCLASS seeded tickets should be visible)
    await expect(page.getByText('PCLASS-101')).toBeVisible()

    // Create button should be disabled when multiple projects are selected
    await expect(page.getByRole('button', { name: 'Create Ticket' })).toBeDisabled()

    // Open dropdown again and click "Deselect All"
    await openDropdown()
    await page.getByText('Deselect All').click({ force: true })
    await page.keyboard.press('Escape')
    await page.waitForLoadState('networkidle')

    // Table should now be empty (no projects selected)
    await expect(page.getByText('PCLASS-101')).toBeHidden()

    // Select just one project — Create button should be enabled
    await openDropdown()
    await page.getByRole('option', { name: /PCLASS/ }).click()
    await page.keyboard.press('Escape')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Create Ticket' })).toBeEnabled()
  })
})
