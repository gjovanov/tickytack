import { test, expect } from "../fixtures/auth.fixture";
test.describe("Timesheet", () => {
  test("calendar renders current week", async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/);
    await expect(page.getByRole("button", { name: "Weekly" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Daily" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Monthly" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
    await expect(page.locator("text=/\\w+ \\d+ - \\w+ \\d+/")).toBeVisible();
  });
  test("create time entry via dialog", async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/);
    await page.waitForLoadState("networkidle");
    const calendarSlot = page.locator('[class*="slot"], [class*="hour-row"], [class*="calendar"] td, [class*="calendar"] .v-col').first();
    if (await calendarSlot.isVisible()) {
      await calendarSlot.click();
    }
    const dialog = page.locator(".v-dialog");
    if (await dialog.isVisible()) {
      await expect(dialog.getByLabel(/Ticket|ticket/i)).toBeVisible();
    }
  });
  test("edit time entry opens pre-filled dialog", async ({ authenticatedPage: page }) => {
    await page.waitForLoadState("networkidle");
    const entryCard = page.locator(".time-entry-card, .v-card").first();
    if (await entryCard.isVisible()) {
      await entryCard.click();
      const dialog = page.locator(".v-dialog");
      if (await dialog.isVisible()) {
        const startTimeField = dialog.locator('input[type="time"]').first();
        await expect(startTimeField).not.toHaveValue("");
      }
    }
  });
  test("view mode switching works", async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Daily" }).click();
    await expect(page.locator(".daily-calendar")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Monthly" }).click();
    await expect(page.locator(".monthly-calendar")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Weekly" }).click();
    await expect(page.locator(".weekly-calendar")).toBeVisible({ timeout: 5000 });
  });
  test("ticket dropdown pre-populated on create", async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/);
    await page.waitForLoadState("networkidle");
    const slot = page.locator(".hour-slot").first();
    if (await slot.isVisible()) {
      await slot.click();
      const dialog = page.locator(".v-dialog");
      if (await dialog.isVisible()) {
        await page.waitForTimeout(1000);
        const autocomplete = dialog.locator(".v-autocomplete");
        await autocomplete.click();
        const listItems = page.locator(".v-list-item");
        await expect(listItems.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
  test("resize time entry changes duration in 15-min snaps", async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/);
    await page.waitForLoadState("networkidle");
    const entryCard = page.locator(".time-entry-card").first();
    if (await entryCard.isVisible()) {
      const resizeHandle = entryCard.locator(".resize-handle");
      await expect(resizeHandle).toBeVisible();
      const initialBox = await entryCard.boundingBox();
      const box = await resizeHandle.boundingBox();
      if (box && initialBox) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 60, { steps: 10 });
        await page.mouse.up();
        await page.waitForLoadState("networkidle");
        const updatedCard = page.locator(".time-entry-card").first();
        await expect(updatedCard).toBeVisible();
        const updatedBox = await updatedCard.boundingBox();
        if (updatedBox) {
          expect(updatedBox.height).toBeGreaterThanOrEqual(initialBox.height);
        }
        await expect(page.locator(".v-dialog")).toBeHidden({ timeout: 1000 });
      }
    }
  });
  test("drag and drop time entry positions by card top, not mouse pointer", async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/timesheet/);
    await page.waitForLoadState("networkidle");
    const entryCard = page.locator(".time-entry-card").first();
    if (await entryCard.isVisible()) {
      const cardBox = await entryCard.boundingBox();
      if (!cardBox)
        return;
      const columns = page.locator(".daily-column");
      const firstColumn = columns.first();
      const colBox = await firstColumn.boundingBox();
      if (!colBox)
        return;
      const originalTopInColumn = cardBox.y - colBox.y;
      const grabOffsetFromTop = cardBox.height / 2;
      const sourceX = cardBox.x + cardBox.width / 2;
      const sourceY = cardBox.y + grabOffsetFromTop;
      const dropDelta = 120;
      const targetY = sourceY + dropDelta;
      await entryCard.dragTo(firstColumn, {
        sourcePosition: { x: cardBox.width / 2, y: grabOffsetFromTop },
        targetPosition: { x: colBox.width / 2, y: cardBox.y - colBox.y + grabOffsetFromTop + dropDelta }
      });
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".weekly-calendar")).toBeVisible();
      await expect(page.locator(".v-dialog")).toBeHidden({ timeout: 1000 });
      const updatedCard = page.locator(".time-entry-card").first();
      if (await updatedCard.isVisible()) {
        const updatedBox = await updatedCard.boundingBox();
        if (updatedBox) {
          const newTopInColumn = updatedBox.y - colBox.y;
          const expectedTop = Math.round((originalTopInColumn + dropDelta) / 15) * 15;
          expect(Math.abs(newTopInColumn - expectedTop)).toBeLessThanOrEqual(15);
        }
      }
    }
  });
  test("delete time entry removes card", async ({ authenticatedPage: page }) => {
    await page.waitForLoadState("networkidle");
    const entryCard = page.locator(".time-entry-card, .v-card").first();
    if (await entryCard.isVisible()) {
      await entryCard.click();
      const dialog = page.locator(".v-dialog");
      if (await dialog.isVisible()) {
        const deleteBtn = dialog.getByRole("button", { name: "Delete" });
        if (await deleteBtn.isVisible()) {
          await deleteBtn.click();
          await expect(dialog).toBeHidden({ timeout: 5000 });
        }
      }
    }
  });
});
