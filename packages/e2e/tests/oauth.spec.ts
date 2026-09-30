import { test, expect, type Page } from '@playwright/test'

test.describe('OAuth Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
  })

  test('shows all OAuth provider buttons on login page', async ({ page }) => {
    for (const provider of ['Google', 'Facebook', 'GitHub', 'LinkedIn', 'Microsoft']) {
      await expect(page.getByRole('button', { name: provider })).toBeVisible()
    }
  })

  test('OAuth buttons are disabled when org slug is empty', async ({ page }) => {
    for (const provider of ['Google', 'Facebook', 'GitHub', 'LinkedIn', 'Microsoft']) {
      await expect(page.getByRole('button', { name: provider })).toBeDisabled()
    }
  })

  test('OAuth buttons become enabled after entering org slug', async ({ page }) => {
    await page.getByLabel('Organization').fill('oebb')

    for (const provider of ['Google', 'Facebook', 'GitHub', 'LinkedIn', 'Microsoft']) {
      await expect(page.getByRole('button', { name: provider })).toBeEnabled()
    }
  })

  test('clicking Google OAuth button navigates to OAuth API', async ({ page }) => {
    await page.getByLabel('Organization').fill('oebb')

    await page.route('**/api/oauth/google**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: 'intercepted' }),
    )

    await page.getByRole('button', { name: 'Google' }).click()
    await page.waitForURL('**/api/oauth/google**', { timeout: 10000 })

    expect(page.url()).toContain('/api/oauth/google')
    expect(page.url()).toContain('org_slug=oebb')
  })

  test('clicking GitHub OAuth button navigates to OAuth API', async ({ page }) => {
    await page.getByLabel('Organization').fill('oebb')

    await page.route('**/api/oauth/github**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: 'intercepted' }),
    )

    await page.getByRole('button', { name: 'GitHub' }).click()
    await page.waitForURL('**/api/oauth/github**', { timeout: 10000 })

    expect(page.url()).toContain('/api/oauth/github')
    expect(page.url()).toContain('org_slug=oebb')
  })

  test('OAuth callback page with no sign-in in progress shows error', async ({ page }) => {
    await page.goto('/auth/oauth-callback')
    await expect(page.getByText('No sign-in is in progress. Please sign in again.')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Back to login')).toBeVisible()
  })

  // The sign-in is completed by an httpOnly cookie the server set, never by the address.
  test('OAuth callback page ignores a token in the URL and removes it', async ({ page }) => {
    const redeem = page.waitForRequest('**/api/auth/oauth-code/redeem**')
    await page.goto('/auth/oauth-callback?token=invalid-mock-token')

    expect((await redeem).postData() ?? '').not.toContain('invalid-mock-token')
    await expect(page.getByText('No sign-in is in progress. Please sign in again.')).toBeVisible({ timeout: 10000 })
    expect(page.url()).not.toContain('token')
    expect(await page.evaluate(() => localStorage.getItem('ttt_token'))).toBeNull()
  })
})

test.describe('OAuth Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
  })

  test('shows all OAuth provider buttons on register page', async ({ page }) => {
    for (const provider of ['Google', 'Facebook', 'GitHub', 'LinkedIn', 'Microsoft']) {
      await expect(page.getByRole('button', { name: provider })).toBeVisible()
    }
  })

  test('OAuth register buttons are always enabled (no org slug required)', async ({ page }) => {
    for (const provider of ['Google', 'Facebook', 'GitHub', 'LinkedIn', 'Microsoft']) {
      await expect(page.getByRole('button', { name: provider })).toBeEnabled()
    }
  })

  test('clicking Google OAuth register button navigates with mode=register', async ({ page }) => {
    await page.route('**/api/oauth/google**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: 'intercepted' }),
    )

    await page.getByRole('button', { name: 'Google' }).click()
    await page.waitForURL('**/api/oauth/google**', { timeout: 10000 })

    expect(page.url()).toContain('/api/oauth/google')
    expect(page.url()).toContain('mode=register')
  })

  // The pending sign-up lives server-side behind an httpOnly cookie; `oauth=1` is only a flag.
  const mockPending = (page: Page) =>
    page.route('**/api/oauth/pending**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email: 'test@example.com', name: 'Test User', provider: 'google' }),
      }),
    )

  test('register page with oauth=1 pre-fills email and hides password', async ({ page }) => {
    await mockPending(page)
    await page.goto('/auth/register?oauth=1')
    await page.waitForLoadState('networkidle')

    // Email should be pre-filled
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveValue('test@example.com')

    // Password field should not be visible
    await expect(page.locator('input[type="password"]')).toHaveCount(0)

    // OAuth buttons should be hidden (already in OAuth flow)
    await expect(page.getByRole('button', { name: 'Google' })).toHaveCount(0)
  })

  test('OAuth registration sends no token', async ({ page }) => {
    await mockPending(page)
    let body: Record<string, unknown> = {}
    await page.route('**/api/oauth/register-oauth**', async (route) => {
      body = route.request().postDataJSON()
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'stopped by test' }) })
    })
    await page.goto('/auth/register?oauth=1')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Organization Name').fill('Test Org')
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByText('stopped by test')).toBeVisible({ timeout: 5000 })
    expect(Object.keys(body).sort()).toEqual(['orgName', 'orgSlug', 'username'])
  })

  test('register page with oauth=1 but no sign-up in progress shows error and the full form', async ({ page }) => {
    await page.goto('/auth/register?oauth=1')
    await expect(page.getByText('No sign-in is in progress. Please sign in again.')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="password"]')).toHaveCount(1)
  })

  test('register page ignores an oauth_token in the URL', async ({ page }) => {
    const payload = { type: 'oauth_pending', email: 'test@example.com', name: 'Test User', provider: 'google', providerId: 'g-123' }
    const fakeToken = `header.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}.signature`

    await page.goto(`/auth/register?oauth_token=${encodeURIComponent(fakeToken)}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('input[type="email"]')).toHaveValue('')
    await expect(page.locator('input[type="password"]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible()
  })
})
