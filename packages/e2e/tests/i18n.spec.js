import { test, expect } from "../fixtures/auth.fixture";
test.describe("i18n Language Toggle", () => {
  test("toggle to German", async ({ authenticatedPage: page }) => {
    await expect(page.locator(".v-navigation-drawer").getByText("Timesheet")).toBeVisible();
    await expect(page.locator(".v-navigation-drawer").getByText("Projects")).toBeVisible();
    await page.locator(".v-app-bar").getByText("DE").click();
    await expect(page.locator(".v-navigation-drawer").getByText("Zeiterfassung")).toBeVisible();
    await expect(page.locator(".v-navigation-drawer").getByText("Projekte")).toBeVisible();
    await expect(page.locator(".v-navigation-drawer").getByText("Benutzer")).toBeVisible();
    await expect(page.locator(".v-navigation-drawer").getByText("Exportieren")).toBeVisible();
  });
  test("toggle back to English", async ({ authenticatedPage: page }) => {
    await page.locator(".v-app-bar").getByText("DE").click();
    await expect(page.locator(".v-navigation-drawer").getByText("Zeiterfassung")).toBeVisible();
    await page.locator(".v-app-bar").getByText("EN").click();
    await expect(page.locator(".v-navigation-drawer").getByText("Timesheet")).toBeVisible();
    await expect(page.locator(".v-navigation-drawer").getByText("Projects")).toBeVisible();
    await expect(page.locator(".v-navigation-drawer").getByText("Users")).toBeVisible();
    await expect(page.locator(".v-navigation-drawer").getByText("Export")).toBeVisible();
  });
});
