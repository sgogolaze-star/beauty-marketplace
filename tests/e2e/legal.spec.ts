import { test, expect } from "@playwright/test";
test("legal drafts default to Georgian, switch language, and never ask for agreement", async ({
  page,
  request,
}) => {
  await page.goto("/login?mode=signup");
  await page
    .locator("form")
    .getByRole("navigation", { name: "Legal information" })
    .getByRole("link", { name: "Privacy", exact: true })
    .click();
  await expect(page.getByRole("main")).toHaveAttribute("lang", "ka");
  await expect(
    page.getByRole("heading", {
      name: "კონფიდენციალურობის შეტყობინება",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("პროექტი — ჯერ არ მოქმედებს", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Document language" })
    .getByRole("link", { name: "English" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Privacy notice", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("lang", "en");
  await expect(
    page.getByText("Draft — not yet in effect", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect((await request.get("/legal/unknown-document")).status()).toBe(404);
  await page.goto("/legal/accept?next=//evil.invalid");
  await expect(page).toHaveURL(/\/login/);
});
