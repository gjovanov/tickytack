import { test, expect } from '../fixtures/auth.fixture'
import { navigateViaNav, waitForLoad, waitForSnackbar } from '../helpers/selectors'

test.describe('Projects', () => {
  test('list projects shows seeded data', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Projects')
    await page.waitForURL('**/admin/projects')
    await waitForLoad(page)

    // Table should show seeded project keys
    await expect(page.getByRole('cell', { name: 'PCLASS', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'PPLUS', exact: true })).toBeVisible()
  })

  test('create project', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Projects')
    await page.waitForURL('**/admin/projects')
    await waitForLoad(page)

    // Use unique key to avoid conflicts across runs
    const suffix = String(Date.now()).slice(-4)
    const key = `TP${suffix}`

    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Fill form in dialog
    const dialog = page.locator('.v-dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Project Name').fill('Test Project')
    await dialog.getByLabel('Key').fill(key)

    // Save
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden({ timeout: 5000 })

    // Verify new project appears in table (use .first() since previous runs may leave "Test Project" entries)
    await expect(page.getByRole('cell', { name: key, exact: true })).toBeVisible()
    await expect(page.getByText('Test Project').first()).toBeVisible()
  })

  test('create project with duplicate key shows error snackbar', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Projects')
    await page.waitForURL('**/admin/projects')
    await waitForLoad(page)

    // Try to create project with existing key "PCLASS"
    await page.getByRole('button', { name: 'Create Project' }).click()
    const dialog = page.locator('.v-dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Project Name').fill('Duplicate Test')
    await dialog.getByLabel('Key').fill('PCLASS')
    await dialog.getByRole('button', { name: 'Save' }).click()

    // Error snackbar should appear
    const snackbar = await waitForSnackbar(page)
    await expect(snackbar).toContainText('already exists')

    // Dialog should remain open (not closed on error)
    await expect(dialog).toBeVisible()
  })

  test('edit project', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Projects')
    await page.waitForURL('**/admin/projects')
    await waitForLoad(page)

    // Click edit icon on first project row
    const editBtn = page.locator('.v-data-table tbody tr').first().locator('button:has(.mdi-pencil)').first()
    await editBtn.click()

    const dialog = page.locator('.v-dialog')
    await expect(dialog).toBeVisible()

    // Clear and update project name with unique value
    const newName = `Updated Name ${Date.now()}`
    const nameField = dialog.getByLabel('Project Name')
    await nameField.clear()
    await nameField.fill(newName)

    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden({ timeout: 5000 })

    // Verify updated name in table
    await expect(page.getByText(newName)).toBeVisible()
  })
})
