import { test, expect } from "@playwright/test";
test("password recovery is discoverable and a session or query flag cannot unlock reset", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveAttribute("type", "email");
  await page.goto("/reset-password?recovery=true&next=//evil.invalid");
  await expect(page.getByRole("heading", { name: "Let’s get you a fresh link." })).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Request a new reset link" })).toHaveAttribute("href", "/forgot-password");
  const response = await request.get("/reset-password");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
test("invalid recovery links produce a safe retry path and never echo tokens", async ({ page }) => {
  await page.goto("/auth/confirm?type=recovery&token_hash=not-a-real-token");
  await expect(page).toHaveURL(/\/forgot-password\?notice=expired$/);
  await expect(page.getByRole("status")).toContainText("has expired");
  await page.goto("/auth/callback?code=not-a-real-code&flow=recovery&sb_flow_id=invalid&next=//evil.invalid");
  await expect(page).toHaveURL(/\/forgot-password\?notice=expired$/);
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByText("not-a-real-code", { exact: false })).toHaveCount(0);
});
