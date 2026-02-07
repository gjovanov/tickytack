import { test, expect } from "../fixtures/auth.fixture";
import { navigateViaNav, waitForLoad } from "../helpers/selectors";
function getCurrentWeekDates() {
  const now = new Date;
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startDate: fmt(monday), endDate: fmt(friday) };
}
test.describe("Export", () => {
  test("export Excel file downloads successfully", async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, "Export");
    await page.waitForURL("**/export");
    await waitForLoad(page);
    await expect(page.getByText("Export Timesheet")).toBeVisible();
    const { startDate, endDate } = getCurrentWeekDates();
    await page.locator('input[type="date"]').first().fill(startDate);
    await page.locator('input[type="date"]').last().fill(endDate);
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("timesheet");
    expect(download.suggestedFilename()).toContain(".xlsx");
    await expect(page).toHaveURL(/\/export/);
  });
  test("export PDF file downloads successfully", async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, "Export");
    await page.waitForURL("**/export");
    await waitForLoad(page);
    await page.getByLabel("Format").locator("..").click();
    await page.getByRole("option", { name: "PDF" }).click();
    const { startDate, endDate } = getCurrentWeekDates();
    await page.locator('input[type="date"]').first().fill(startDate);
    await page.locator('input[type="date"]').last().fill(endDate);
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("timesheet");
    expect(download.suggestedFilename()).toContain(".pdf");
    await expect(page).toHaveURL(/\/export/);
  });
});
