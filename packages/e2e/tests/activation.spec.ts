import { test, expect } from '@playwright/test'

// The activation email's link carries its code in the fragment; links sent before that carry it
// in the query and must keep working. Either way the page reads it once and clears the address
// before it calls the API.
test.describe('Account activation link', () => {
  const userId = '65f000000000000000000001'
  const token = 'ABC1234'

  for (const [form, suffix] of [
    ['fragment', `#userId=${userId}&token=${token}`],
    ['query of an already-sent link', `?userId=${userId}&token=${token}`],
  ]) {
    test(`activates from the ${form} and clears the address`, async ({ page }) => {
      let body: unknown
      let addressAtRequest = ''
      await page.route('**/api/auth/activate**', async (route) => {
        body = route.request().postDataJSON()
        addressAtRequest = page.url()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Account activated successfully. You can now sign in.' }),
        })
      })

      await page.goto(`/auth/activate${suffix}`)

      await expect(page.getByText('Account activated successfully. You can now sign in.')).toBeVisible({ timeout: 10000 })
      expect(body).toEqual({ userId, token })
      expect(addressAtRequest).not.toContain(token)
      expect(page.url()).not.toContain(token)
    })
  }

  test('an incomplete link says so and calls nothing', async ({ page }) => {
    let called = false
    await page.route('**/api/auth/activate**', async (route) => {
      called = true
      await route.abort()
    })

    await page.goto('/auth/activate')

    await expect(page.getByText('This activation link is incomplete.', { exact: false })).toBeVisible({ timeout: 10000 })
    expect(called).toBe(false)
  })
})
