import { test, expect } from '../fixtures/auth.fixture'

test.describe('i18n Language Toggle', () => {
  test('toggle to German', async ({ authenticatedPage: page }) => {
    // Default should be English - nav items in English
    await expect(page.locator('.v-navigation-drawer').getByText('Timesheet')).toBeVisible()
    await expect(page.locator('.v-navigation-drawer').getByText('Projects')).toBeVisible()

    // Click the language toggle button (shows "DE" when in English mode)
    await page.locator('.v-app-bar').getByText('DE').click()

    // Nav items should now be in German
    await expect(page.locator('.v-navigation-drawer').getByText('Zeiterfassung')).toBeVisible()
    await expect(page.locator('.v-navigation-drawer').getByText('Projekte')).toBeVisible()
    await expect(page.locator('.v-navigation-drawer').getByText('Benutzer')).toBeVisible()
    await expect(page.locator('.v-navigation-drawer').getByText('Exportieren')).toBeVisible()
  })

  test('toggle back to English', async ({ authenticatedPage: page }) => {
    // First switch to German
    await page.locator('.v-app-bar').getByText('DE').click()
    await expect(page.locator('.v-navigation-drawer').getByText('Zeiterfassung')).toBeVisible()

    // Now toggle back - button shows "EN" when in German mode
    await page.locator('.v-app-bar').getByText('EN').click()

    // Nav items should be back in English
    await expect(page.locator('.v-navigation-drawer').getByText('Timesheet')).toBeVisible()
    await expect(page.locator('.v-navigation-drawer').getByText('Projects')).toBeVisible()
    await expect(page.locator('.v-navigation-drawer').getByText('Users')).toBeVisible()
    await expect(page.locator('.v-navigation-drawer').getByText('Export')).toBeVisible()
  })
})
