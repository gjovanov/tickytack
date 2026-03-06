/**
 * TickyTack Intro Video Recording
 *
 * This Playwright test records a full user journey as a video.
 * It injects an on-screen transcription overlay at each scene,
 * creating a narrated walkthrough suitable for a product intro.
 *
 * Run:
 *   cd packages/e2e
 *   PATH=$HOME/.local/node/bin:$PATH ./node_modules/.bin/playwright test video/record-intro.spec.ts --config=playwright.video.config.ts
 *
 * Output:
 *   test-results/record-intro-{hash}/video.webm
 *   Convert to MP4 via scripts/record-video.sh
 */
import { test, type Page } from '@playwright/test'
import { navigateViaNav, waitForLoad } from '../helpers/selectors'
import transcriptions from './transcriptions.json' with { type: 'json' }

// ---------------------------------------------------------------------------
// Overlay helpers
// ---------------------------------------------------------------------------

async function injectOverlay(page: Page) {
  await page.evaluate(() => {
    if (document.getElementById('tt-overlay')) return

    const overlay = document.createElement('div')
    overlay.id = 'tt-overlay'
    Object.assign(overlay.style, {
      position: 'fixed',
      bottom: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '99999',
      background: 'rgba(30, 26, 23, 0.88)',
      color: '#FFF3E0',
      padding: '16px 32px',
      borderRadius: '12px',
      fontSize: '22px',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      fontWeight: '500',
      letterSpacing: '0.01em',
      maxWidth: '720px',
      textAlign: 'center',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(245, 124, 0, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      opacity: '0',
      transition: 'opacity 0.4s ease',
      pointerEvents: 'none',
    })
    document.body.appendChild(overlay)
  })
}

async function showCaption(page: Page, text: string) {
  await page.evaluate((t) => {
    const el = document.getElementById('tt-overlay')
    if (!el) return
    el.textContent = t
    el.style.opacity = '1'
  }, text)
}

async function hideCaption(page: Page) {
  await page.evaluate(() => {
    const el = document.getElementById('tt-overlay')
    if (el) el.style.opacity = '0'
  })
}

async function caption(page: Page, scene: number) {
  const t = transcriptions.find((s) => s.scene === scene)
  if (!t) return
  await showCaption(page, t.text)
  await page.waitForTimeout(t.duration)
  await hideCaption(page)
  await page.waitForTimeout(400) // fade-out gap
}

function delay(page: Page, ms: number) {
  return page.waitForTimeout(ms)
}

// ---------------------------------------------------------------------------
// Video recording test
// ---------------------------------------------------------------------------

test.describe('TickyTack Intro Video', () => {
  test('record full intro walkthrough', async ({ page }) => {
    test.setTimeout(300_000) // 5 minutes max

    // Unique suffix to avoid conflicts with previous runs
    const suffix = Date.now().toString().slice(-6)

    // -----------------------------------------------------------------------
    // Scene 1: Landing page
    // -----------------------------------------------------------------------
    await page.goto('/landing')
    await page.waitForLoadState('networkidle')
    await injectOverlay(page)
    await delay(page, 800)
    await caption(page, 1)

    // Scroll through hero, features, pricing
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }))
    await delay(page, 1500)
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'smooth' }))
    await delay(page, 1500)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await delay(page, 1000)

    // -----------------------------------------------------------------------
    // Scene 2: Register
    // -----------------------------------------------------------------------
    const getStartedBtn = page.getByRole('link', { name: /get started/i })
      .or(page.getByRole('button', { name: /get started/i }))
      .first()
    if (await getStartedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStartedBtn.click()
    } else {
      await page.goto('/auth/register')
    }
    await page.waitForLoadState('networkidle')
    await injectOverlay(page)
    await delay(page, 500)
    await caption(page, 2)

    // Show registration form with visible typing (don't submit — activation required)
    const firstNameField = page.getByLabel('First Name')
    await firstNameField.click()
    await firstNameField.pressSequentially('Alex', { delay: 60 })
    await delay(page, 200)

    const lastNameField = page.getByLabel('Last Name')
    await lastNameField.click()
    await lastNameField.pressSequentially('Demo', { delay: 60 })
    await delay(page, 200)

    const emailField = page.getByLabel('Email')
    await emailField.click()
    await emailField.pressSequentially(`alex@tickytack.app`, { delay: 60 })
    await delay(page, 200)

    const usernameField = page.getByLabel('Username')
    await usernameField.click()
    await usernameField.pressSequentially(`alexdemo`, { delay: 60 })
    await delay(page, 200)

    const passwordField = page.locator('input[type="password"]')
    await passwordField.click()
    await passwordField.pressSequentially('SecureP@ss123', { delay: 60 })
    await delay(page, 200)

    const orgNameField = page.getByLabel('Organization Name')
    await orgNameField.click()
    await orgNameField.pressSequentially('Demo Corp', { delay: 60 })
    await delay(page, 200)

    const orgSlugField = page.getByLabel('Organization Slug')
    await orgSlugField.click()
    await orgSlugField.pressSequentially('demo-corp', { delay: 60 })
    await delay(page, 800)

    // Navigate to login instead of submitting (email activation is required)
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    await delay(page, 500)

    // Login as seeded admin user
    await page.getByLabel('Organization').fill('oebb')
    await page.getByLabel('Username').fill('gjovanov')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL('**/timesheet', { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await delay(page, 500)

    // -----------------------------------------------------------------------
    // Scene 3: Timesheet overview
    // -----------------------------------------------------------------------
    await injectOverlay(page)
    await caption(page, 3)

    // Hover over time entry cards
    const entryCards = page.locator('.time-entry-card')
    const cardCount = await entryCards.count()
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      await entryCards.nth(i).hover()
      await delay(page, 600)
    }
    await delay(page, 500)

    // -----------------------------------------------------------------------
    // Scene 4: Create time entry via drag
    // -----------------------------------------------------------------------
    // Switch to daily view for a single column
    await page.getByRole('button', { name: 'Daily' }).click()
    await page.locator('.daily-calendar').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    await delay(page, 500)

    const column = page.locator('.daily-column')
    const colBox = await column.boundingBox()
    if (colBox) {
      // Drag from 10:00 to 12:00 (240px to 360px from column top, based on 06:00 start)
      const startY = colBox.y + 240
      const endY = colBox.y + 360
      const centerX = colBox.x + colBox.width / 2

      await page.mouse.move(centerX, startY)
      await page.mouse.down()
      await page.mouse.move(centerX, endY, { steps: 15 })
      await page.mouse.up()

      // Dialog should open
      const dialog = page.locator('.v-dialog')
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await delay(page, 500)

        // Open ticket dropdown and pick first option
        const autocomplete = dialog.locator('.v-autocomplete')
        if (await autocomplete.isVisible({ timeout: 1000 }).catch(() => false)) {
          await autocomplete.click()
          await delay(page, 500)
          // Use the overlay's dropdown menu, not nav items
          const menuOption = page.locator('.v-overlay--active .v-list-item').first()
          if (await menuOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await menuOption.click({ force: true })
            await delay(page, 300)
          }
        }

        // Save or Cancel
        const saveBtn = dialog.getByRole('button', { name: 'Save' })
        if (await saveBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await saveBtn.click()
          await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
        } else {
          const cancelBtn = dialog.getByRole('button', { name: /cancel/i })
          if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await cancelBtn.click()
            await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
          }
        }
      }
    }

    await injectOverlay(page)
    await caption(page, 4)

    // -----------------------------------------------------------------------
    // Scene 5: View modes (Daily -> Monthly -> Weekly)
    // -----------------------------------------------------------------------
    await page.getByRole('button', { name: 'Monthly' }).click()
    await page.locator('.monthly-calendar').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    await delay(page, 1200)

    await page.getByRole('button', { name: 'Weekly' }).click()
    await page.locator('.weekly-calendar').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    await delay(page, 800)

    await injectOverlay(page)
    await caption(page, 5)

    // -----------------------------------------------------------------------
    // Scene 6: Projects list
    // -----------------------------------------------------------------------
    await navigateViaNav(page, 'Projects')
    await page.waitForURL('**/admin/projects', { timeout: 10_000 }).catch(() => {})
    await waitForLoad(page)
    await delay(page, 500)

    await injectOverlay(page)
    await caption(page, 6)

    // Hover seeded projects
    const pclassCell = page.getByRole('cell', { name: 'PCLASS', exact: true })
    if (await pclassCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pclassCell.hover()
      await delay(page, 500)
    }
    const pplusCell = page.getByRole('cell', { name: 'PPLUS', exact: true })
    if (await pplusCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pplusCell.hover()
      await delay(page, 500)
    }

    // -----------------------------------------------------------------------
    // Scene 7: Create project
    // -----------------------------------------------------------------------
    await page.getByRole('button', { name: 'Create Project' }).click()
    const projDialog = page.locator('.v-dialog')
    await projDialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    await delay(page, 300)

    const projNameField = projDialog.getByLabel('Project Name')
    await projNameField.click()
    await projNameField.pressSequentially('Demo Project', { delay: 60 })
    await delay(page, 200)

    const projKeyField = projDialog.getByLabel('Key')
    await projKeyField.click()
    await projKeyField.pressSequentially(`DP${suffix.slice(0, 4)}`, { delay: 60 })
    await delay(page, 300)

    await projDialog.getByRole('button', { name: 'Save' }).click()
    await projDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    await delay(page, 500)

    await injectOverlay(page)
    await caption(page, 7)

    // -----------------------------------------------------------------------
    // Scene 8: Tickets
    // -----------------------------------------------------------------------
    await navigateViaNav(page, 'Tickets')
    await page.waitForURL('**/admin/tickets', { timeout: 10_000 }).catch(() => {})
    await waitForLoad(page)
    await delay(page, 500)

    // Select a project to see tickets
    await page.getByRole('combobox', { name: 'Project' }).click({ force: true })
    await page.getByRole('option', { name: /PCLASS/ }).click()
    await page.keyboard.press('Escape')
    await page.waitForLoadState('networkidle')
    await delay(page, 800)

    // Create a ticket
    await page.getByRole('button', { name: 'Create Ticket' }).click()
    const ticketDialog = page.locator('.v-dialog')
    await ticketDialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})

    const summaryField = ticketDialog.getByLabel('Summary')
    await summaryField.click()
    await summaryField.pressSequentially('Build intro video automation', { delay: 60 })
    await delay(page, 200)

    const hoursField = ticketDialog.getByLabel('Estimated Hours')
    await hoursField.click()
    await hoursField.pressSequentially('8', { delay: 60 })
    await delay(page, 300)

    await ticketDialog.getByRole('button', { name: 'Save' }).click()
    await ticketDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    await delay(page, 500)

    await injectOverlay(page)
    await caption(page, 8)

    // -----------------------------------------------------------------------
    // Scene 9: Users
    // -----------------------------------------------------------------------
    await navigateViaNav(page, 'Users')
    await page.waitForURL('**/admin/users', { timeout: 10_000 }).catch(() => {})
    await waitForLoad(page)
    await delay(page, 500)

    await injectOverlay(page)
    await caption(page, 9)

    // Hover over user rows
    const gjovanovCell = page.getByRole('cell', { name: 'gjovanov', exact: true })
    if (await gjovanovCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gjovanovCell.hover()
      await delay(page, 500)
    }
    const cburkerCell = page.getByRole('cell', { name: 'cburker', exact: true })
    if (await cburkerCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cburkerCell.hover()
      await delay(page, 500)
    }

    // -----------------------------------------------------------------------
    // Scene 10: Invites
    // -----------------------------------------------------------------------
    await page.goto('/admin/invites')
    await page.waitForLoadState('networkidle')
    await waitForLoad(page)
    await delay(page, 500)

    // Create a shareable invite
    await page.getByRole('button', { name: /create invite/i }).click()
    const inviteDialog = page.locator('.v-dialog')
    await inviteDialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    await delay(page, 500)

    // Default is Shareable Link, just click Create
    await inviteDialog.getByRole('button', { name: /^create$/i }).click()
    await inviteDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    await delay(page, 800)

    await injectOverlay(page)
    await caption(page, 10)

    // -----------------------------------------------------------------------
    // Scene 11: Export
    // -----------------------------------------------------------------------
    await navigateViaNav(page, 'Export')
    await page.waitForURL('**/export', { timeout: 10_000 }).catch(() => {})
    await waitForLoad(page)
    await delay(page, 500)

    // Fill date range with current week
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const startDateInput = page.locator('input[type="date"]').first()
    const endDateInput = page.locator('input[type="date"]').last()
    await startDateInput.fill(fmt(monday))
    await delay(page, 300)
    await endDateInput.fill(fmt(friday))
    await delay(page, 500)

    // Wait for preview table
    const dataTable = page.locator('.v-data-table')
    await dataTable.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
    await delay(page, 1000)

    // Scroll preview table into view
    if (await dataTable.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dataTable.scrollIntoViewIfNeeded()
      await delay(page, 800)
    }

    // Click Download (intercept to avoid actual file save blocking)
    const downloadBtn = page.getByRole('button', { name: 'Download' })
    if (await downloadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
      await downloadBtn.click()
      const download = await downloadPromise
      if (download) {
        await download.delete()
      }
      await delay(page, 500)
    }

    await injectOverlay(page)
    await caption(page, 11)

    // -----------------------------------------------------------------------
    // Scene 12: Import Excel
    // -----------------------------------------------------------------------
    await navigateViaNav(page, 'Import')
    await page.waitForURL('**/import', { timeout: 10_000 }).catch(() => {})
    await waitForLoad(page)
    await delay(page, 500)

    await injectOverlay(page)

    // Show the import page with file input and controls
    const fileInput = page.locator('.v-file-input')
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fileInput.hover()
      await delay(page, 400)
    }

    // Show the replace checkbox
    const replaceCheckbox = page.getByLabel('Replace existing time entries')
    if (await replaceCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await replaceCheckbox.hover()
      await delay(page, 400)
    }

    await caption(page, 12)

    // -----------------------------------------------------------------------
    // Scene 13: JIRA Integration
    // -----------------------------------------------------------------------
    await navigateViaNav(page, 'JIRA')
    await page.waitForURL('**/admin/jira', { timeout: 10_000 }).catch(() => {})
    await waitForLoad(page)
    await delay(page, 500)

    await injectOverlay(page)

    // Show connection settings
    const jiraUrlField = page.getByLabel('JIRA URL')
    if (await jiraUrlField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jiraUrlField.click()
      await jiraUrlField.pressSequentially('https://mycompany.atlassian.net', { delay: 40 })
      await delay(page, 300)
    }

    const jiraEmailField = page.getByLabel('JIRA Email')
    if (await jiraEmailField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await jiraEmailField.click()
      await jiraEmailField.pressSequentially('admin@mycompany.com', { delay: 40 })
      await delay(page, 300)
    }

    const apiTokenField = page.getByLabel('API Token')
    if (await apiTokenField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTokenField.click()
      await apiTokenField.pressSequentially('ATT-demo-token-1234567890', { delay: 40 })
      await delay(page, 300)
    }

    // Hover over Test Connection button
    const testConnBtn = page.getByRole('button', { name: 'Test Connection' })
    if (await testConnBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await testConnBtn.hover()
      await delay(page, 500)
    }

    await caption(page, 13)

    // -----------------------------------------------------------------------
    // Scene 14: Billing
    // -----------------------------------------------------------------------
    // Navigate to billing via direct URL (may not be in nav for all roles)
    await page.goto('/admin/billing')
    await page.waitForLoadState('networkidle')
    await delay(page, 500)

    await injectOverlay(page)

    // Scroll to show pricing plans
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }))
    await delay(page, 1000)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await delay(page, 500)

    await caption(page, 14)

    // -----------------------------------------------------------------------
    // Scene 15: i18n toggle (EN -> DE -> EN)
    // -----------------------------------------------------------------------
    // Click DE button in app bar to switch to German
    const deButton = page.locator('.v-app-bar').getByText('DE')
    if (await deButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deButton.click()
      await delay(page, 1200)

      await injectOverlay(page)
      await caption(page, 15)

      // Switch back to English
      const enButton = page.locator('.v-app-bar').getByText('EN')
      if (await enButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await enButton.click()
        await delay(page, 800)
      }
    } else {
      await injectOverlay(page)
      await caption(page, 15)
    }

    // -----------------------------------------------------------------------
    // Scene 16: Theme toggle (light -> dark -> light)
    // -----------------------------------------------------------------------
    // Find theme toggle icon button in app bar (sun/moon icon)
    const themeToggle = page.locator('.v-app-bar button:has(.mdi-weather-night), .v-app-bar button:has(.mdi-weather-sunny), .v-app-bar button:has(.mdi-brightness-6)').first()
    if (await themeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await themeToggle.click()
      await delay(page, 1200)

      await injectOverlay(page)
      await caption(page, 16)

      // Toggle back
      const themeToggleBack = page.locator('.v-app-bar button:has(.mdi-weather-night), .v-app-bar button:has(.mdi-weather-sunny), .v-app-bar button:has(.mdi-brightness-6)').first()
      if (await themeToggleBack.isVisible({ timeout: 2000 }).catch(() => false)) {
        await themeToggleBack.click()
        await delay(page, 800)
      }
    } else {
      await injectOverlay(page)
      await caption(page, 16)
    }

    // -----------------------------------------------------------------------
    // Scene 17: Closing — back to landing
    // -----------------------------------------------------------------------
    // Logout first
    await page.locator('.v-avatar').click()
    await delay(page, 300)
    await page.getByText('Logout').click()
    await page.waitForURL('**/auth/login', { timeout: 10_000 }).catch(() => {})
    await delay(page, 500)

    await page.goto('/landing')
    await page.waitForLoadState('networkidle')
    await injectOverlay(page)
    await delay(page, 1000)

    await caption(page, 17)
    await delay(page, 1000)
  })
})
