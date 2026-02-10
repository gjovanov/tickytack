import { test, expect } from "@playwright/test";
test.describe("Invite System", () => {
  test.describe("Invite Landing Page", () => {
    test("invalid invite code shows error", async ({ page }) => {
      await page.goto("/invite/invalid-code-that-does-not-exist");
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("Invite Not Found")).toBeVisible({ timeout: 1e4 });
      await expect(page.getByRole("link", { name: /go to login/i })).toBeVisible();
    });
    test("invite landing page shows loading then result", async ({ page }) => {
      await page.goto("/invite/some-fake-code");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".v-card")).toBeVisible({ timeout: 1e4 });
    });
  });
  test.describe("Admin Invite Management", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/auth/login");
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Organization").fill("oebb");
      await page.getByLabel("Username").fill("gjovanov");
      await page.locator('input[type="password"]').fill("admin123");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL("**/timesheet", { timeout: 15000 });
    });
    test("admin can navigate to invites page", async ({ page }) => {
      await page.goto("/admin/invites");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: /invites/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /create invite/i })).toBeVisible();
      await expect(page.locator(".v-data-table")).toBeVisible();
    });
    test("admin can open create invite dialog", async ({ page }) => {
      await page.goto("/admin/invites");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: /create invite/i }).click();
      const dialog = page.locator(".v-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(".v-card-title")).toContainText("Create Invite");
      await expect(dialog.getByText("Shareable Link")).toBeVisible();
      await expect(dialog.getByText("Email Invite")).toBeVisible();
      await expect(dialog.getByLabel("Role")).toBeVisible();
      await expect(dialog.getByRole("button", { name: /create/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /cancel/i })).toBeVisible();
    });
    test("admin can create a shareable invite", async ({ page }) => {
      await page.goto("/admin/invites");
      await page.waitForLoadState("networkidle");
      const initialRows = await page.locator(".v-data-table tbody tr").count();
      await page.getByRole("button", { name: /create invite/i }).click();
      const dialog = page.locator(".v-dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: /^create$/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5000 });
      await page.waitForTimeout(1000);
      await expect(page.locator(".v-data-table tbody tr")).toHaveCount(initialRows + 1);
      await expect(page.locator(".v-chip", { hasText: "active" }).first()).toBeVisible();
    });
  });
  test.describe("Register with Invite", () => {
    test("register page with invite param hides org fields and shows joining banner", async ({ page }) => {
      await page.goto("/auth/login");
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Organization").fill("oebb");
      await page.getByLabel("Username").fill("gjovanov");
      await page.locator('input[type="password"]').fill("admin123");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL("**/timesheet", { timeout: 15000 });
      await page.goto("/admin/invites");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: /create invite/i }).click();
      const dialog = page.locator(".v-dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: /^create$/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5000 });
      await page.waitForTimeout(500);
      const codeEl = page.locator(".v-data-table tbody tr").first().locator("code");
      const inviteCode = await codeEl.textContent();
      await page.locator(".v-avatar").click();
      await page.getByText("Logout").click();
      await page.waitForURL("**/auth/login");
      await page.goto(`/auth/register?invite=${inviteCode}`);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/joining/i)).toBeVisible({ timeout: 1e4 });
      await expect(page.getByLabel("Organization Name")).toBeHidden();
      await expect(page.getByLabel("Organization Slug")).toBeHidden();
    });
  });
});
