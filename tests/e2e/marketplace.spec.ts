import { test, expect } from "@playwright/test";
test("registration offers customer, business and individual professional paths", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    nav.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Sign up", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Create customer account" }),
  ).toBeVisible();
  await page.getByLabel("Email address").fill("typed@example.invalid");
  await page.getByLabel("Full name").fill("Test Person");
  await page
    .getByLabel("Password", { exact: true })
    .fill("preserve-this-password");
  const choices = page.getByRole("group", { name: "I’m joining as a" });
  await expect(choices.getByRole("radio")).toHaveCount(3);
  await choices.getByRole("radio", { name: "Business", exact: true }).check();
  await expect(
    page.getByText("For salons, studios and teams.", { exact: false }),
  ).toBeVisible();
  await choices.getByRole("radio", { name: "Individual professional" }).check();
  await expect(
    choices.getByRole("radio", { name: "Individual professional" }),
  ).toBeChecked();
  await expect(page.getByLabel("Email address")).toHaveValue(
    "typed@example.invalid",
  );
  await expect(page.getByLabel("Full name")).toHaveValue("Test Person");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    "preserve-this-password",
  );
  await choices.getByRole("radio", { name: "Customer", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    choices.getByRole("radio", { name: "Business", exact: true }),
  ).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("discovery filters, studio navigation, and no horizontal overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little time. A little more you." }),
  ).toBeVisible();
  await expect(page.locator(".venue-card")).toHaveCount(3);
  await page
    .getByRole("navigation", { name: "Treatment categories" })
    .getByRole("link", { name: "Nails", exact: false })
    .click();
  await expect(page.locator(".venue-card")).toHaveCount(1);
  await expect(page.locator(".venue-card")).toContainText("Nail Atelier");
  await page.locator(".venue-card").click();
  await expect(
    page.getByRole("heading", { name: "Nail Atelier", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional preview studio · Bookings are not available"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test("search has an honest empty state and can clear filters", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Treatment or studio" })
    .fill("nothing-matches-this");
  await page.getByRole("button", { name: "Find my moment" }).click();
  await expect(
    page.getByRole("heading", { name: "A fresh start?" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.locator(".venue-card")).toHaveCount(3);
});
test("private account and auth callbacks fail safely", async ({
  page,
  request,
}) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.goto("/login?next=//evil.test");
  await expect(page.locator("input[name=next]")).toHaveValue("/account");
  await page.goto("/auth/callback?next=//evil.test");
  await expect(page).toHaveURL(/\/login\?message=/);
  const response = await request.get("/account", { maxRedirects: 0 });
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await request.get("/venues/does-not-exist")).status()).toBe(404);
});
test("failed sign-in returns a useful message without granting access", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("nonexistent@bloom-test.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Sign-in failed");
  await expect(page).toHaveURL(/\/login/);
});
