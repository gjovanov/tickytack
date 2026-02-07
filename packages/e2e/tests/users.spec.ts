import { test, expect } from '../fixtures/auth.fixture'
import { navigateViaNav, waitForLoad } from '../helpers/selectors'

test.describe('Users', () => {
  test('list users shows seeded data', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Users')
    await page.waitForURL('**/admin/users')
    await waitForLoad(page)

    // Table should show seeded users (use exact cell match to avoid email ambiguity)
    await expect(page.getByRole('cell', { name: 'gjovanov', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'cburker', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Goran', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Christian', exact: true })).toBeVisible()
  })

  test('add user', async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, 'Users')
    await page.waitForURL('**/admin/users')
    await waitForLoad(page)

    // Click Add User button
    await page.getByRole('button', { name: 'Add User' }).click()

    const dialog = page.locator('.v-dialog')
    await expect(dialog).toBeVisible()

    // Fill user form with unique data
    const suffix = Date.now()
    const username = `tester${suffix}`
    await dialog.getByLabel('First Name').fill('Test')
    await dialog.getByLabel('Last Name').fill('User')
    await dialog.getByLabel('Email').fill(`${username}@oebb.at`)
    await dialog.getByLabel('Username').fill(username)
    await dialog.locator('input[type="password"]').fill('test123')

    // Save
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden({ timeout: 5000 })

    // Verify new user appears in table
    await expect(page.getByRole('cell', { name: username, exact: true })).toBeVisible()
  })
})
