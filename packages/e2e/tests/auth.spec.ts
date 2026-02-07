import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Organization').fill('oebb')
    await page.getByLabel('Username').fill('gjovanov')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await page.waitForURL('**/timesheet', { timeout: 15000 })
    await expect(page).toHaveURL(/\/timesheet/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Organization').fill('oebb')
    await page.getByLabel('Username').fill('gjovanov')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.locator('.v-alert')).toBeVisible()
  })

  test('register new user and org', async ({ page }) => {
    const suffix = Date.now()
    await page.goto('/auth/register')
    await page.getByLabel('First Name').fill('Test')
    await page.getByLabel('Last Name').fill('User')
    await page.getByLabel('Email').fill(`test${suffix}@neworg.com`)
    await page.getByLabel('Username').fill(`testuser${suffix}`)
    await page.locator('input[type="password"]').fill('test123456')
    await page.getByLabel('Organization Name').fill('New Test Org')
    await page.getByLabel('Organization Slug').fill(`new-test-org-${suffix}`)
    await page.getByRole('button', { name: 'Create Account' }).click()

    await page.waitForURL('**/timesheet')
    await expect(page).toHaveURL(/\/timesheet/)
  })

  test('auth guard redirects to login', async ({ page }) => {
    await page.goto('/timesheet')
    await page.waitForURL('**/auth/login')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('logout redirects to login', async ({ page }) => {
    // First login
    await page.goto('/auth/login')
    await page.getByLabel('Organization').fill('oebb')
    await page.getByLabel('Username').fill('gjovanov')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL('**/timesheet')

    // Click user avatar to open menu
    await page.locator('.v-avatar').click()
    // Click logout
    await page.getByText('Logout').click()

    await page.waitForURL('**/auth/login')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
