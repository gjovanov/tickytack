export async function fillTextField(page, label, value) {
  await page.getByLabel(label).fill(value);
}
export async function clickButton(page, text) {
  await page.getByRole("button", { name: text }).click();
}
export async function waitForDialog(page) {
  const dialog = page.locator(".v-dialog");
  await dialog.waitFor({ state: "visible" });
  return dialog;
}
export function getTableRows(page) {
  return page.locator(".v-data-table tbody tr");
}
export async function waitForSnackbar(page) {
  const snackbar = page.locator(".v-snackbar");
  await snackbar.waitFor({ state: "visible" });
  return snackbar;
}
export async function navigateViaNav(page, itemText) {
  await page.waitForLoadState("networkidle");
  await page.getByRole("navigation").getByRole("link", { name: itemText }).click();
}
export async function waitForLoad(page) {
  await page.locator(".v-progress-linear").waitFor({ state: "hidden", timeout: 1e4 }).catch(() => {});
}
