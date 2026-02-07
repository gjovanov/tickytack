import { test as base } from "@playwright/test";
export async function login(page) {
  await page.goto("/auth/login");
  await page.getByLabel("Organization").fill("oebb");
  await page.getByLabel("Username").fill("gjovanov");
  await page.locator('input[type="password"]').fill("admin123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/timesheet");
  await page.waitForLoadState("networkidle");
}
export const test = base.extend({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page);
    await use(page);
    await context.close();
  }
});
export { expect } from "@playwright/test";
