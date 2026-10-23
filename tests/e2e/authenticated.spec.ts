import { test, expect } from "@playwright/test";

test("sign-in persists an SSR session and sign-out removes private access", async ({
  page,
}) => {
  test.skip(
    !process.env.BLOOM_TEST_EMAIL || !process.env.BLOOM_TEST_PASSWORD,
    "Requires a disposable confirmed test account.",
  );
  await page.goto("/login");
  await page.getByLabel("Email address").fill(process.env.BLOOM_TEST_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.BLOOM_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByText(`Signed in as ${process.env.BLOOM_TEST_EMAIL}`),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your appointments" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your next moment of care starts here.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});
