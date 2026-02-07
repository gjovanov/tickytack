import { test, expect } from "../fixtures/auth.fixture";
import { navigateViaNav, waitForLoad } from "../helpers/selectors";
test.describe("Users", () => {
  test("list users shows seeded data", async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, "Users");
    await page.waitForURL("**/admin/users");
    await waitForLoad(page);
    await expect(page.getByRole("cell", { name: "gjovanov", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "cburker", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Goran", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Christian", exact: true })).toBeVisible();
  });
  test("add user", async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, "Users");
    await page.waitForURL("**/admin/users");
    await waitForLoad(page);
    await page.getByRole("button", { name: "Add User" }).click();
    const dialog = page.locator(".v-dialog");
    await expect(dialog).toBeVisible();
    const suffix = Date.now();
    const username = `tester${suffix}`;
    await dialog.getByLabel("First Name").fill("Test");
    await dialog.getByLabel("Last Name").fill("User");
    await dialog.getByLabel("Email").fill(`${username}@oebb.at`);
    await dialog.getByLabel("Username").fill(username);
    await dialog.locator('input[type="password"]').fill("test123");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await expect(page.getByRole("cell", { name: username, exact: true })).toBeVisible();
  });
});
