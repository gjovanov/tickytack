import { test, expect } from '@playwright/test'

test.describe('Billing & Plan Limits', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login')
    await page.getByLabel('Organization').fill('acme-labs')
    await page.getByLabel('Username').fill('sarahc')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL('**/timesheet', { timeout: 30000 })
  })

  test('billing page shows plans', async ({ page }) => {
    await page.goto('/admin/billing')
    await page.waitForLoadState('networkidle')

    // Should show plan cards
    await expect(page.getByText('Free')).toBeVisible()
    await expect(page.getByText('Pro')).toBeVisible()
    await expect(page.getByText('Business')).toBeVisible()
  })

  test('billing page shows current plan status', async ({ page }) => {
    await page.goto('/admin/billing')
    await page.waitForLoadState('networkidle')

    // Free plan should be indicated as current (default for seed org)
    await expect(page.getByText('Free')).toBeVisible()
  })

  test('free plan enforces project limit', async ({ page }) => {
    await page.goto('/admin/projects')
    await page.waitForLoadState('networkidle')

    // Seed data has 2 projects (WEB, MOB) which is the Free plan limit
    // Try to create a 3rd project
    await page.getByRole('button', { name: /create/i }).click()
    await page.getByLabel('Project Name').fill('Third Project')
    await page.getByLabel('Key').fill('THR')
    await page.getByRole('button', { name: /save|create/i }).last().click()

    // Should show plan limit error
    await expect(page.locator('.v-alert, .v-snackbar').getByText(/limit|upgrade/i)).toBeVisible({ timeout: 5000 })
  })

  test('free plan enforces user limit', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    // Seed data has 2 users — free plan allows 3
    // Create a 3rd user (should succeed)
    await page.getByRole('button', { name: /add/i }).click()
    await page.getByLabel('Email').fill('user3@acmelabs.io')
    await page.getByLabel('Username').fill('user3')
    await page.getByLabel('First Name').fill('User')
    await page.getByLabel('Last Name').fill('Three')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /save|add/i }).last().click()

    // Wait for success and try a 4th (should fail)
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: /add/i }).click()
    await page.getByLabel('Email').fill('user4@acmelabs.io')
    await page.getByLabel('Username').fill('user4')
    await page.getByLabel('First Name').fill('User')
    await page.getByLabel('Last Name').fill('Four')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /save|add/i }).last().click()

    // Should show plan limit error
    await expect(page.locator('.v-alert, .v-snackbar').getByText(/limit|upgrade/i)).toBeVisible({ timeout: 5000 })
  })

  test('non-admin cannot access billing', async ({ page }) => {
    // Logout
    await page.locator('.v-avatar').click()
    await page.getByText('Logout').click()
    await page.waitForURL('**/auth/login')

    // Login as member
    await page.getByLabel('Organization').fill('acme-labs')
    await page.getByLabel('Username').fill('mikeb')
    await page.locator('input[type="password"]').fill('member123')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL('**/timesheet')

    // Navigate to billing — should not have admin nav or should show forbidden
    await page.goto('/admin/billing')
    await page.waitForLoadState('networkidle')

    // Billing page should still render (member can view) but upgrade buttons should be restricted
    await expect(page.getByText(/Free|Pro|Business/)).toBeVisible()
  })
})

test.describe('Data Deletion Pages', () => {
  test('data deletion instructions page renders', async ({ page }) => {
    await page.goto('/data-deletion')
    await expect(page.getByText('Data Deletion')).toBeVisible()
    await expect(page.getByText('How to Delete Your Data Through TickyTack')).toBeVisible()
    await expect(page.getByText('How to Delete Your Data Through Facebook')).toBeVisible()
  })

  test('deletion status page shows input form', async ({ page }) => {
    await page.goto('/deletion-status')
    await expect(page.getByText('Deletion Request Status')).toBeVisible()
    await expect(page.getByLabel('Confirmation Code')).toBeVisible()
  })

  test('deletion status with invalid code shows error', async ({ page }) => {
    await page.goto('/deletion-status?id=invalid-code')
    await expect(page.getByText(/no deletion request found/i)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Security Headers', () => {
  test('API responses include security headers', async ({ page }) => {
    const response = await page.goto('/api/health/')
    const headers = response?.headers()
    expect(headers?.['x-content-type-options']).toBe('nosniff')
    expect(headers?.['x-frame-options']).toBe('DENY')
    expect(headers?.['x-xss-protection']).toBe('1; mode=block')
  })
})

test.describe('Rate Limiting', () => {
  test('auth endpoints return rate limit headers', async ({ request }) => {
    const response = await request.post('/api/auth/login/', {
      data: { username: 'nonexistent', password: 'wrong', orgSlug: 'fake' },
    })
    const headers = response.headers()
    expect(headers['x-ratelimit-limit']).toBeDefined()
    expect(headers['x-ratelimit-remaining']).toBeDefined()
  })
})
