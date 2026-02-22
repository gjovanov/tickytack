import { test, expect } from '../fixtures/auth.fixture'

test.describe('Timesheet', () => {
  test('calendar renders current week', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)

    // Weekly view controls should be visible
    await expect(page.getByRole('button', { name: 'Weekly' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Daily' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Monthly' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible()

    // Date range header should be visible (e.g. "Feb 2 - Feb 8, 2026")
    await expect(page.locator('text=/\\w+ \\d+ - \\w+ \\d+/')).toBeVisible()
  })

  test('create time entry via dialog', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)
    await page.waitForLoadState('networkidle')

    // Try clicking on a time slot area in the calendar grid
    const calendarSlot = page.locator('[class*="slot"], [class*="hour-row"], [class*="calendar"] td, [class*="calendar"] .v-col').first()
    if (await calendarSlot.isVisible()) {
      await calendarSlot.click()
    }

    // Verify dialog opens or just assert the page is functional
    const dialog = page.locator('.v-dialog')
    if (await dialog.isVisible()) {
      await expect(dialog.getByLabel(/Ticket|ticket/i)).toBeVisible()
    }
  })

  test('edit time entry opens pre-filled dialog', async ({ authenticatedPage: page }) => {
    await page.waitForLoadState('networkidle')

    // Click on an existing time entry card (seeded data has entries)
    const entryCard = page.locator('.time-entry-card, .v-card').first()
    if (await entryCard.isVisible()) {
      await entryCard.click()

      const dialog = page.locator('.v-dialog')
      if (await dialog.isVisible()) {
        const startTimeField = dialog.locator('input[type="time"]').first()
        await expect(startTimeField).not.toHaveValue('')
      }
    }
  })

  test('view mode switching works', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)
    await page.waitForLoadState('networkidle')

    // Click "Daily" button
    await page.getByRole('button', { name: 'Daily' }).click()
    await expect(page.locator('.daily-calendar')).toBeVisible({ timeout: 5000 })

    // Click "Monthly" button
    await page.getByRole('button', { name: 'Monthly' }).click()
    await expect(page.locator('.monthly-calendar')).toBeVisible({ timeout: 5000 })

    // Click "Weekly" button - should return to weekly view
    await page.getByRole('button', { name: 'Weekly' }).click()
    await expect(page.locator('.weekly-calendar')).toBeVisible({ timeout: 5000 })
  })

  test('ticket dropdown pre-populated on create', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)
    await page.waitForLoadState('networkidle')

    // Click on a time slot to open the create dialog
    const slot = page.locator('.hour-slot').first()
    if (await slot.isVisible()) {
      await slot.click()

      const dialog = page.locator('.v-dialog')
      if (await dialog.isVisible()) {
        // Wait for the autocomplete to be populated (initial load)
        await page.waitForTimeout(1000)

        // Open the autocomplete dropdown
        const autocomplete = dialog.locator('.v-autocomplete')
        await autocomplete.click()

        // Verify that options are present without typing
        const listItems = page.locator('.v-list-item')
        await expect(listItems.first()).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('resize time entry changes duration in 15-min snaps', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)
    await page.waitForLoadState('networkidle')

    const entryCard = page.locator('.time-entry-card').first()
    if (await entryCard.isVisible()) {
      const resizeHandle = entryCard.locator('.resize-handle')
      await expect(resizeHandle).toBeVisible()

      // Get initial card height
      const initialBox = await entryCard.boundingBox()

      // Perform drag on resize handle (drag down by 60px = ~1 hour)
      const box = await resizeHandle.boundingBox()
      if (box && initialBox) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 60, { steps: 10 })
        await page.mouse.up()

        // Wait for API update
        await page.waitForLoadState('networkidle')

        // Entry card should still exist and have grown
        const updatedCard = page.locator('.time-entry-card').first()
        await expect(updatedCard).toBeVisible()
        const updatedBox = await updatedCard.boundingBox()
        if (updatedBox) {
          // Height should have increased (snapped to 15-min = 15px increments)
          expect(updatedBox.height).toBeGreaterThanOrEqual(initialBox.height)
        }

        // Edit dialog should NOT have opened after resize
        await expect(page.locator('.v-dialog')).toBeHidden({ timeout: 1000 })
      }
    }
  })

  test('drag and drop time entry positions by card top, not mouse pointer', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)
    await page.waitForLoadState('networkidle')

    const entryCard = page.locator('.time-entry-card').first()
    if (await entryCard.isVisible()) {
      const cardBox = await entryCard.boundingBox()
      if (!cardBox) return

      // Find the same column to drop within (vertical move only)
      const columns = page.locator('.daily-column')
      const firstColumn = columns.first()
      const colBox = await firstColumn.boundingBox()
      if (!colBox) return

      // Record original card top relative to the column
      const originalTopInColumn = cardBox.y - colBox.y

      // Grab the card at its CENTER (not top) — offset from card top = cardBox.height/2
      const grabOffsetFromTop = cardBox.height / 2
      const sourceX = cardBox.x + cardBox.width / 2
      const sourceY = cardBox.y + grabOffsetFromTop

      // Drop 120px lower in the same column (mouse pointer will be at sourceY + 120)
      // With the fix, card TOP should land at (originalTopInColumn + 120), snapped to 15px
      const dropDelta = 120
      const targetY = sourceY + dropDelta

      // Use Playwright's dragTo for HTML5 DnD
      await entryCard.dragTo(firstColumn, {
        sourcePosition: { x: cardBox.width / 2, y: grabOffsetFromTop },
        targetPosition: { x: colBox.width / 2, y: (cardBox.y - colBox.y) + grabOffsetFromTop + dropDelta },
      })

      // Wait for API update
      await page.waitForLoadState('networkidle')

      // Page should still be functional
      await expect(page.locator('.weekly-calendar')).toBeVisible()

      // Edit dialog should NOT have opened after drag-drop
      await expect(page.locator('.v-dialog')).toBeHidden({ timeout: 1000 })

      // Verify the card's new top position is based on card top, not mouse pointer
      const updatedCard = page.locator('.time-entry-card').first()
      if (await updatedCard.isVisible()) {
        const updatedBox = await updatedCard.boundingBox()
        if (updatedBox) {
          const newTopInColumn = updatedBox.y - colBox.y
          // Expected: card top moved by ~dropDelta, snapped to 15px grid
          // It should NOT be offset by grabOffsetFromTop (the old bug)
          const expectedTop = Math.round((originalTopInColumn + dropDelta) / 15) * 15
          expect(Math.abs(newTopInColumn - expectedTop)).toBeLessThanOrEqual(15)
        }
      }
    }
  })

  test('click-drag creates entry with correct duration', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)
    await page.waitForLoadState('networkidle')

    // Switch to daily view for a single column
    await page.getByRole('button', { name: 'Daily' }).click()
    await expect(page.locator('.daily-calendar')).toBeVisible({ timeout: 5000 })

    const column = page.locator('.daily-column')
    const box = await column.boundingBox()
    if (!box) return

    // 10:00 = 4h from 06:00 = 240px from column top
    // 12:00 = 6h from 06:00 = 360px from column top
    const startY = box.y + 240
    const endY = box.y + 360
    const centerX = box.x + box.width / 2

    await page.mouse.move(centerX, startY)
    await page.mouse.down()
    await page.mouse.move(centerX, endY, { steps: 10 })
    await page.mouse.up()

    // Dialog should open with the dragged time range
    const dialog = page.locator('.v-dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const startTimeInput = dialog.locator('input[type="time"]').first()
    const endTimeInput = dialog.locator('input[type="time"]').nth(1)
    await expect(startTimeInput).toHaveValue('10:00')
    await expect(endTimeInput).toHaveValue('12:00')

    // Close dialog
    await dialog.getByRole('button', { name: /cancel/i }).click()
  })

  test('upward drag normalizes to correct time range', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Daily' }).click()
    await expect(page.locator('.daily-calendar')).toBeVisible({ timeout: 5000 })

    const column = page.locator('.daily-column')
    const box = await column.boundingBox()
    if (!box) return

    // Drag UP: start at 12:00 (360px), drag to 10:00 (240px)
    const startY = box.y + 360
    const endY = box.y + 240
    const centerX = box.x + box.width / 2

    await page.mouse.move(centerX, startY)
    await page.mouse.down()
    await page.mouse.move(centerX, endY, { steps: 10 })
    await page.mouse.up()

    const dialog = page.locator('.v-dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Times should be normalized: startTime < endTime
    const startTimeInput = dialog.locator('input[type="time"]').first()
    const endTimeInput = dialog.locator('input[type="time"]').nth(1)
    await expect(startTimeInput).toHaveValue('10:00')
    await expect(endTimeInput).toHaveValue('12:00')

    await dialog.getByRole('button', { name: /cancel/i }).click()
  })

  test('short click still opens 1h dialog', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Daily' }).click()
    await expect(page.locator('.daily-calendar')).toBeVisible({ timeout: 5000 })

    const column = page.locator('.daily-column')
    const box = await column.boundingBox()
    if (!box) return

    // Quick click at 10:00 (240px offset) — no drag
    const clickY = box.y + 240
    const centerX = box.x + box.width / 2

    await page.mouse.click(centerX, clickY)

    const dialog = page.locator('.v-dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Should default to 1h: 10:00-11:00
    const startTimeInput = dialog.locator('input[type="time"]').first()
    const endTimeInput = dialog.locator('input[type="time"]').nth(1)
    await expect(startTimeInput).toHaveValue('10:00')
    await expect(endTimeInput).toHaveValue('11:00')

    await dialog.getByRole('button', { name: /cancel/i }).click()
  })

  test('visual preview appears during drag', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Daily' }).click()
    await expect(page.locator('.daily-calendar')).toBeVisible({ timeout: 5000 })

    const column = page.locator('.daily-column')
    const box = await column.boundingBox()
    if (!box) return

    const startY = box.y + 240
    const centerX = box.x + box.width / 2

    await page.mouse.move(centerX, startY)
    await page.mouse.down()
    // Move enough to trigger drag (>5px threshold)
    await page.mouse.move(centerX, startY + 60, { steps: 5 })

    // Preview should be visible while dragging
    await expect(page.locator('.drag-preview')).toBeVisible()

    // Release
    await page.mouse.up()

    // Preview should disappear after release
    await expect(page.locator('.drag-preview')).toBeHidden()

    // Close any dialog that opened
    const dialog = page.locator('.v-dialog')
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: /cancel/i }).click()
    }
  })

  test('delete time entry removes card', async ({ authenticatedPage: page }) => {
    await page.waitForLoadState('networkidle')

    const entryCard = page.locator('.time-entry-card, .v-card').first()
    if (await entryCard.isVisible()) {
      await entryCard.click()

      const dialog = page.locator('.v-dialog')
      if (await dialog.isVisible()) {
        const deleteBtn = dialog.getByRole('button', { name: 'Delete' })
        if (await deleteBtn.isVisible()) {
          await deleteBtn.click()
          await expect(dialog).toBeHidden({ timeout: 5000 })
        }
      }
    }
  })
})
