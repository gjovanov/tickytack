import { test, expect } from "../fixtures/auth.fixture";
import { navigateViaNav, waitForLoad } from "../helpers/selectors";
test.describe("Projects", () => {
  test("list projects shows seeded data", async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, "Projects");
    await page.waitForURL("**/admin/projects");
    await waitForLoad(page);
    await expect(page.getByRole("cell", { name: "PCLASS", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "PPLUS", exact: true })).toBeVisible();
  });
  test("create project", async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, "Projects");
    await page.waitForURL("**/admin/projects");
    await waitForLoad(page);
    const suffix = String(Date.now()).slice(-4);
    const key = `TP${suffix}`;
    await page.getByRole("button", { name: "Create Project" }).click();
    const dialog = page.locator(".v-dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Project Name").fill("Test Project");
    await dialog.getByLabel("Key").fill(key);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await expect(page.getByRole("cell", { name: key, exact: true })).toBeVisible();
    await expect(page.getByText("Test Project")).toBeVisible();
  });
  test("edit project", async ({ authenticatedPage: page }) => {
    await navigateViaNav(page, "Projects");
    await page.waitForURL("**/admin/projects");
    await waitForLoad(page);
    const editBtn = page.locator(".v-data-table tbody tr").first().locator("button:has(.mdi-pencil)").first();
    await editBtn.click();
    const dialog = page.locator(".v-dialog");
    await expect(dialog).toBeVisible();
    const newName = `Updated Name ${Date.now()}`;
    const nameField = dialog.getByLabel("Project Name");
    await nameField.clear();
    await nameField.fill(newName);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await expect(page.getByText(newName)).toBeVisible();
  });
});
