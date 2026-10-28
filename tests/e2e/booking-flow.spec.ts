import { test, expect as baseExpect, type Page } from "@playwright/test";
import { tbilisiDate } from "../../src/lib/booking-validation";
import path from "node:path";
import fs from "node:fs";
const expect = baseExpect.configure({ timeout: 15000 });
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(account|onboarding)(\?.*)?$/);
}
test("owner setup → customer booking → cancellation releases availability", async ({
  page,
  browser,
}, testInfo) => {
  const journey = process.env.BLOOM_JOURNEY_FIXTURES
    ? JSON.parse(fs.readFileSync(process.env.BLOOM_JOURNEY_FIXTURES, "utf8"))
    : null;
  const fixture = journey?.fixtures.find(
    (f: { project: string }) => f.project === testInfo.project.name,
  );
  const ownerEmail = fixture?.providerEmail ?? process.env.BLOOM_OWNER_EMAIL;
  const customerEmail = fixture?.customerEmail ?? process.env.BLOOM_TEST_EMAIL;
  const password = journey?.password ?? process.env.BLOOM_TEST_PASSWORD;
  test.skip(
    !ownerEmail || !customerEmail || !password,
    "Requires disposable owner/customer accounts and an operator-provisioned test business.",
  );
  test.setTimeout(90000);
  const suffix = testInfo.project.name,
    studio = `Booking Studio ${suffix}`,
    treatment = `Care ritual ${suffix}`;
  const slug = `booking-e2e-${suffix}`;
  const day = tbilisiDate(new Date(new Date().getTime() + 2 * 86400000));
  await login(page, ownerEmail!, password!);
  await page.goto("/business");
  await page.getByText("Add a studio", { exact: true }).click();
  const studioForm = page.locator("details.workspace-panel");
  await studioForm.getByLabel("Studio name").fill(studio);
  await studioForm.getByLabel("Studio URL slug").fill(slug);
  await studioForm.getByRole("button", { name: "Create draft studio" }).click();
  const panel = page
    .locator("section.workspace-panel")
    .filter({ has: page.getByRole("heading", { name: studio, exact: true }) });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Publish studio" }).click();
  await expect(page.getByRole("status")).toContainText(
    "public provider contact details",
  );
  const publicForm = page
    .locator("section.workspace-panel")
    .filter({
      has: page.getByRole("heading", {
        name: "Public provider details",
        exact: true,
      }),
    });
  await publicForm
    .getByLabel("Public contact email")
    .fill(`public-${suffix}@example.invalid`);
  await publicForm.getByLabel("Public contact phone").fill("+995 555 222 333");
  await publicForm
    .getByLabel("Public contact address")
    .fill("Public Business Street 20, Tbilisi");
  await publicForm
    .getByLabel("I understand these contact details", { exact: false })
    .check();
  await expect(publicForm.getByRole("checkbox")).toBeChecked();
  expect(await publicForm.locator("form").evaluate(form => (form as HTMLFormElement).checkValidity())).toBe(true);
  await publicForm
    .getByRole("button", { name: "Save public contact details" })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await panel
    .getByLabel("Public service location or area")
    .fill("Public Treatment Street 30, Tbilisi");
  await panel.getByRole("button", { name: "Save service location" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  await panel.getByRole("button", { name: "Publish studio" }).click();
  await expect(
    panel.getByRole("button", { name: "Unpublish studio" }),
  ).toBeVisible();
  await panel
    .locator("summary")
    .filter({ hasText: /^Add treatment$/ })
    .click();
  await panel.getByLabel("Treatment name").fill(treatment);
  await panel.getByLabel("Price (GEL)").fill("75.50");
  await panel
    .getByRole("button", { name: "Add treatment", exact: true })
    .click();
  await expect(
    panel.locator(".workspace-list strong").filter({ hasText: treatment }),
  ).toBeVisible();
  await panel
    .locator("summary")
    .filter({ hasText: /^Add professional$/ })
    .click();
  await panel.getByLabel("Professional name").fill(`Artist ${suffix}`);
  await panel
    .getByRole("button", { name: "Add professional", exact: true })
    .click();
  await expect(
    panel
      .locator(".workspace-list strong")
      .filter({ hasText: `Artist ${suffix}` }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Assign treatment" }).click();
  await expect(
    panel
      .locator(".workspace-list li")
      .filter({ hasText: `Artist ${suffix} · ${treatment}` }),
  ).toBeVisible();
  await panel.getByLabel("Starts (Tbilisi)").fill(`${day}T10:00`);
  await panel.getByLabel("Ends (Tbilisi)").fill(`${day}T12:00`);
  await panel.getByRole("button", { name: "Add availability" }).click();
  await expect(
    panel.getByRole("button", { name: "Remove window" }),
  ).toHaveCount(1);
  const use = testInfo.project.use;
  const customer = await browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    deviceScaleFactor: use.deviceScaleFactor,
    userAgent: use.userAgent,
    reducedMotion: "reduce",
  });
  const cp = await customer.newPage();
  await login(cp, customerEmail!, password!);
  await cp.goto(`/venues/${slug}`);
  const disclosure = cp.getByRole("region", {
    name: "Service provider details",
  });
  await expect(disclosure).toContainText("Public Business Street 20");
  await expect(disclosure).toContainText("Public Treatment Street 30");
  if (journey) {
    await expect(disclosure).toContainText("Fixture Provider Legal Name");
    await expect(
      cp.getByText("Fixture Street 10, Tbilisi", { exact: true }),
    ).toHaveCount(0);
    if (suffix === "desktop")
      await expect(disclosure).toContainText("123456789");
    else
      await expect(
        disclosure.getByText("Company registration code", { exact: true }),
      ).toHaveCount(0);
  }
  if (process.env.BLOOM_CAPTURE_DIR)
    await cp.screenshot({
      path: path.join(
        process.env.BLOOM_CAPTURE_DIR,
        `provider-listing-${suffix}.png`,
      ),
      fullPage: true,
    });
  await cp.getByRole("link", { name: "Choose time" }).click();
  await expect(cp).toHaveURL(/\/book\/[0-9a-f-]+/);
  await expect(
    cp.getByRole("region", { name: "Service provider details" }),
  ).toContainText(`public-${suffix}@example.invalid`);
  const bookingUrl = new URL(cp.url()).pathname;
  await cp.getByLabel("Appointment date").fill(day);
  await cp.getByRole("button", { name: "Show times" }).click();
  await expect(cp.getByRole("radio")).toHaveCount(7);
  if (process.env.BLOOM_CAPTURE_DIR)
    await cp.screenshot({
      path: path.join(process.env.BLOOM_CAPTURE_DIR, `booking-${suffix}.png`),
      fullPage: true,
    });
  await cp.getByRole("radio").first().check();
  await cp
    .getByRole("button", { name: "Confirm appointment", exact: false })
    .click();
  await expect(cp.getByRole("status")).toContainText(
    "Your appointment is confirmed",
  );
  const appointment = cp
    .locator(".appointment-list li")
    .filter({ hasText: treatment });
  await expect(appointment).toContainText("75.50");
  await cp.goto(`${bookingUrl}?day=${day}`);
  await expect(cp.getByRole("radio")).toHaveCount(5);
  expect(
    await cp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.goto("/business");
  await panel.getByRole("button", { name: "Remove window" }).click();
  await expect(page.getByRole("status")).toContainText(
    "confirmed appointments",
  );
  await cp.goto("/account");
  await appointment.getByText("Cancel appointment", { exact: true }).click();
  await appointment
    .getByRole("button", { name: "Yes, cancel appointment" })
    .click();
  await expect(cp.getByRole("status")).toContainText("cancelled");
  await cp.goto(`${bookingUrl}?day=${day}`);
  await expect(cp.getByRole("radio")).toHaveCount(7);
  await page.goto("/business");
  await panel.getByRole("button", { name: "Remove window" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  await expect(
    panel.getByRole("button", { name: "Remove window" }),
  ).toHaveCount(0);
  await cp.goto(`${bookingUrl}?day=${day}`);
  await expect(
    cp.getByRole("heading", { name: "A different day, perhaps?" }),
  ).toBeVisible();
  await page.goto("/business");
  await panel.getByRole("button", { name: "Unpublish studio" }).click();
  await expect(
    panel.getByRole("button", { name: "Publish studio" }),
  ).toBeVisible();
  await cp.goto(`/venues/${slug}`);
  await expect(cp.getByRole("heading", { name: "This space isn’t here." })).toBeVisible();
  await expect(cp.getByRole("region", { name: "Service provider details" })).toHaveCount(0);
  await expect(cp.getByRole("link", { name: "Choose time" })).toHaveCount(0);
  await customer.close();
});
