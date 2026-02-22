import type { Page, Locator } from '@playwright/test'

/** Fill a Vuetify v-text-field by its label */
export async function fillTextField(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value)
}

/** Click a button by its text content */
export async function clickButton(page: Page, text: string) {
  await page.getByRole('button', { name: text }).click()
}

/** Wait for a Vuetify dialog to appear and return its locator */
export async function waitForDialog(page: Page): Promise<Locator> {
  const dialog = page.locator('.v-dialog')
  await dialog.waitFor({ state: 'visible' })
  return dialog
}

/** Get the Vuetify data table body rows */
export function getTableRows(page: Page): Locator {
  return page.locator('.v-data-table tbody tr')
}

/** Wait for snackbar notification to appear */
export async function waitForSnackbar(page: Page): Promise<Locator> {
  const snackbar = page.locator('.v-snackbar')
  await snackbar.waitFor({ state: 'visible' })
  return snackbar
}

/** Navigate to a page via the side navigation drawer */
export async function navigateViaNav(page: Page, itemText: string) {
  await page.waitForLoadState('networkidle')
  const link = page.getByRole('navigation').getByRole('link', { name: itemText })
  await link.waitFor({ state: 'visible', timeout: 5000 })
  const currentUrl = page.url()
  await link.click()
  // If URL didn't change after click, wait briefly and retry
  await page.waitForTimeout(500)
  if (page.url() === currentUrl) {
    await link.click()
  }
}

/** Wait for page loading to complete (no loading indicators visible) */
export async function waitForLoad(page: Page) {
  await page.locator('.v-progress-linear').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
}
