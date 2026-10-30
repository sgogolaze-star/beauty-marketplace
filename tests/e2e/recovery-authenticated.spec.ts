import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
type Fixture = { id: string; name: string; email: string; password: string; nextPassword: string; tokenHash: string; verifier: string; authUrl: string };
test("verified recovery changes the password, signs out and rejects reuse", async ({ page, context, request, baseURL }, info) => {
  test.skip(!process.env.BLOOM_RECOVERY_FIXTURES, "Requires disposable Auth fixtures; no real email is sent.");
  const fixtures: Fixture[] = JSON.parse(fs.readFileSync(process.env.BLOOM_RECOVERY_FIXTURES!, "utf8"));
  const fixture = fixtures.find(item => item.name === info.project.name)!;
  await page.goto("/login");
  await page.getByLabel("Email address").fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/reset-password?recovery=true");
  await expect(page.getByRole("heading", { name: "Let’s get you a fresh link." })).toBeVisible();
  // Auth fixtures represent an email link with a matching browser PKCE verifier.
  // Auth performs the real one-time-token validation and code exchange; no SMTP is used.
  const verifyUrl = new URL("/auth/v1/verify", fixture.authUrl);
  verifyUrl.searchParams.set("type", "recovery");
  verifyUrl.searchParams.set("token", fixture.tokenHash);
  const response = await request.get(verifyUrl.toString(), { maxRedirects: 0 });
  const code = new URL(response.headers().location).searchParams.get("code");
  expect(Boolean(code)).toBe(true);
  await context.addCookies([{
    name: "sb-gjyahozqsvbodomymkkc-auth-token-code-verifier",
    value: "base64-" + Buffer.from(JSON.stringify(fixture.verifier + "/PASSWORD_RECOVERY")).toString("base64url"),
    url: baseURL!, sameSite: "Lax",
  }]);
  const callback = `/auth/callback?flow=recovery&code=${encodeURIComponent(code!)}`;
  await page.goto(callback);
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByRole("heading", { name: "Choose a new password." })).toBeVisible();
  // Validation must not consume the permission.
  await page.getByLabel("New password", { exact: true }).fill(fixture.nextPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill("different-valid-password");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("same password");
  await page.getByLabel("New password", { exact: true }).fill(fixture.nextPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(fixture.nextPassword);
  if (process.env.BLOOM_CAPTURE_DIR) {
    await page.getByRole("heading", { name: "Choose a new password." }).click();
    await page.screenshot({ path: path.join(process.env.BLOOM_CAPTURE_DIR, `reset-password-${info.project.name}.png`) });
  }
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?message=/);
  await expect(page.getByRole("status")).toContainText("Password updated");
  const cookies = await context.cookies();
  expect(cookies.filter(cookie => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name))).toHaveLength(0);
  await page.getByLabel("Email address").fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Sign-in failed");
  await page.getByLabel("Email address").fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.nextPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto(callback);
  await expect(page).toHaveURL(/\/forgot-password\?notice=expired$/);
  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "Let’s get you a fresh link." })).toBeVisible();
});
