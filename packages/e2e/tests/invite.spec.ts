import { test, expect } from '@playwright/test'

test.describe('Invite System', () => {
  test.describe('Invite Landing Page', () => {
    test('invalid invite code shows error', async ({ page }) => {
      await page.goto('/invite/invalid-code-that-does-not-exist')
      await page.waitForLoadState('networkidle')

      // Should show error card with "Invite Not Found"
      await expect(page.getByText('Invite Not Found', { exact: true })).toBeVisible({ timeout: 10000 })
      // Should have a "Go to Login" button
      await expect(page.getByRole('link', { name: /go to login/i })).toBeVisible()
    })

    test('invite landing page shows loading then result', async ({ page }) => {
      // Even a bad code will go through the loading state then error
      await page.goto('/invite/some-fake-code')
      // Eventually should resolve to either error or invite info
      await page.waitForLoadState('networkidle')
      // Card should be visible (either error or invite info)
      await expect(page.locator('.v-card')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Admin Invite Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      await page.getByLabel('Organization').fill('oebb')
      await page.getByLabel('Username').fill('gjovanov')
      await page.locator('input[type="password"]').fill('admin123')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await page.waitForURL('**/timesheet', { timeout: 15000 })
    })

    test('admin can navigate to invites page', async ({ page }) => {
      await page.goto('/admin/invites')
      await page.waitForLoadState('networkidle')

      // Should show the invites heading
      await expect(page.getByRole('heading', { name: /invites/i })).toBeVisible()
      // Should show the "Create Invite" button
      await expect(page.getByRole('button', { name: /create invite/i })).toBeVisible()
      // Should show the data table
      await expect(page.locator('.v-data-table')).toBeVisible()
    })

    test('admin can open create invite dialog', async ({ page }) => {
      await page.goto('/admin/invites')
      await page.waitForLoadState('networkidle')

      // Click "Create Invite" button
      await page.getByRole('button', { name: /create invite/i }).click()

      // Dialog should appear
      const dialog = page.locator('.v-dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('.v-card-title')).toContainText('Create Invite')

      // Should have radio buttons for shareable link and email
      await expect(dialog.getByText('Shareable Link')).toBeVisible()
      await expect(dialog.getByText('Email Invite')).toBeVisible()

      // Should have role selector
      await expect(dialog.getByLabel('Role')).toBeVisible()

      // Should have Create and Cancel buttons
      await expect(dialog.getByRole('button', { name: /create/i })).toBeVisible()
      await expect(dialog.getByRole('button', { name: /cancel/i })).toBeVisible()
    })

    test('admin can create a shareable invite', async ({ page }) => {
      await page.goto('/admin/invites')
      await page.waitForLoadState('networkidle')

      // Click "Create Invite"
      await page.getByRole('button', { name: /create invite/i }).click()
      const dialog = page.locator('.v-dialog')
      await expect(dialog).toBeVisible()

      // "Shareable Link" is the default mode, just click Create
      await dialog.getByRole('button', { name: /^create$/i }).click()

      // Dialog should close
      await expect(dialog).toBeHidden({ timeout: 5000 })

      // Reload to get properly formatted list from API
      await page.goto('/admin/invites')
      await page.waitForLoadState('networkidle')

      // Table should show an active invite chip
      await expect(page.locator('.v-chip', { hasText: 'active' }).first()).toBeVisible({ timeout: 5000 })
      // Code should be visible
      await expect(page.locator('.v-data-table tbody tr').first().locator('code')).toBeVisible()
    })
  })

  test.describe('Register with Invite', () => {
    test('register page with invite param hides org fields and shows joining banner', async ({ page }) => {
      // We need a valid invite code, so first create one via admin
      // Login as admin
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      await page.getByLabel('Organization').fill('oebb')
      await page.getByLabel('Username').fill('gjovanov')
      await page.locator('input[type="password"]').fill('admin123')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await page.waitForURL('**/timesheet', { timeout: 15000 })

      // Create an invite via the admin page
      await page.goto('/admin/invites')
      await page.waitForLoadState('networkidle')
      await page.getByRole('button', { name: /create invite/i }).click()
      const dialog = page.locator('.v-dialog')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: /^create$/i }).click()
      await expect(dialog).toBeHidden({ timeout: 5000 })

      // Reload to get properly formatted invite list from API
      await page.goto('/admin/invites')
      await page.waitForLoadState('networkidle')

      // Wait for the invite to appear in the table
      const codeEl = page.locator('.v-data-table tbody tr').first().locator('code')
      await codeEl.waitFor({ state: 'visible', timeout: 5000 })
      const inviteCode = await codeEl.textContent()

      // Logout
      await page.locator('.v-avatar').click()
      await page.getByText('Logout').click()
      await page.waitForURL('**/auth/login', { timeout: 10000 }).catch(() =>
        page.waitForURL('**/landing', { timeout: 5000 }).catch(() => {}))

      // Go to register with invite code
      await page.goto(`/auth/register?invite=${inviteCode}`)
      await page.waitForLoadState('networkidle')

      // Should show "Joining" banner with org name
      await expect(page.getByText(/joining/i)).toBeVisible({ timeout: 10000 })

      // Organization Name and Organization Slug fields should NOT be visible
      await expect(page.getByLabel('Organization Name')).toBeHidden()
      await expect(page.getByLabel('Organization Slug')).toBeHidden()
    })
  })
})
