import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
function fixture(project: string) {
  const kind = project === "desktop" ? "business" : "professional";
  return {
    kind,
    email: `bloom-${kind}-${process.env.BLOOM_PROVIDER_SUFFIX}@example.invalid`,
    name:
      kind === "business"
        ? "Application Test Studio"
        : "Application Test Professional",
  };
}
async function login(page: Page, project: string) {
  const f = fixture(project);
  await page.goto("/login");
  await page.getByLabel("Email address").fill(f.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.BLOOM_PROVIDER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  return f;
}
test.beforeEach(() =>
  test.skip(
    !process.env.BLOOM_PROVIDER_SUFFIX || !process.env.BLOOM_PROVIDER_PASSWORD,
    "Requires disposable provider fixtures. Review decisions are made separately through Supabase.",
  ),
);
test("provider submits an application and waits for review", async ({
  page,
}, info) => {
  const f = await login(page, info.project.name);
  await page
    .getByLabel(
      f.kind === "business"
        ? "Business or studio name"
        : "Professional display name",
    )
    .fill(f.name);
  const providerType = page.getByRole("group", {
    name: "Provider type",
    exact: true,
  });
  await providerType
    .getByRole("radio", {
      name: f.kind === "business" ? "Individual professional" : "Business",
      exact: true,
    })
    .check();
  await providerType
    .getByRole("radio", {
      name: f.kind === "business" ? "Business" : "Individual professional",
      exact: true,
    })
    .check();
  await expect(page.locator("input[name=public_name]")).toHaveValue(f.name);
  await page
    .getByLabel(
      f.kind === "business" ? "Contact person’s full name" : "Your full name",
    )
    .fill("Test Provider");
  await page
    .getByLabel("Legal provider name", { exact: false })
    .fill("Fixture Provider Legal Name");
  await page
    .getByLabel("Provider contact address", { exact: false })
    .fill("Fixture Street 10, Tbilisi");
  await page.getByLabel("Phone number").fill("+995 555 000 123");
  if (f.kind === "business")
    await page
      .getByLabel("Company registration code", { exact: false })
      .fill("123456789");
  await page.getByLabel("City", { exact: true }).fill("Tbilisi");
  await page
    .getByLabel("Workspace address or service area", { exact: false })
    .fill("Vake district service area");
  await page.getByLabel("Hair", { exact: true }).check();
  await page.getByLabel("Years of professional experience").fill("4");
  await page
    .getByLabel("About your services", { exact: false })
    .fill(
      "Independent beauty and wellness services with thoughtful care for every client.",
    );
  await page.getByLabel("I confirm these details", { exact: false }).check();
  if (process.env.BLOOM_CAPTURE_DIR)
    await page.screenshot({
      path: path.join(
        process.env.BLOOM_CAPTURE_DIR,
        `provider-form-${info.project.name}.png`,
      ),
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Under review" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit for review", exact: true }),
  ).toHaveCount(0);
  await page.goto("/business");
  await expect(
    page.getByRole("heading", { name: "Business approval comes first." }),
  ).toBeVisible();
});
test("provider sees Supabase decision and can resubmit a rejection", async ({
  page,
}, info) => {
  const f = await login(page, info.project.name);
  if (f.kind === "business") {
    await expect(
      page.getByRole("heading", { name: "Changes needed" }),
    ).toBeVisible();
    await expect(
      page.getByText("Please clarify your studio location.", { exact: false }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Edit and resubmit" }).click();
    await expect(page.getByLabel("Business or studio name")).toHaveValue(
      f.name,
    );
    await page
      .getByLabel("Workspace address or service area", { exact: false })
      .fill("Vake district, clearly described test studio location");
    await page.getByLabel("I confirm these details", { exact: false }).check();
    await page
      .getByRole("button", { name: "Submit updated application" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Under review" }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("heading", { name: "Your provider workspace is ready." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Open provider workspace" }).click();
    await expect(
      page.getByRole("heading", { name: f.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".workspace-list strong").filter({ hasText: f.name }),
    ).toBeVisible();
  }
});
test("approved provider opens the provisioned draft workspace", async ({
  page,
}, info) => {
  const f = await login(page, info.project.name);
  await expect(
    page.getByRole("heading", { name: "Your provider workspace is ready." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open provider workspace" }).click();
  await expect(
    page.getByRole("heading", { name: f.name, exact: true }),
  ).toBeVisible();
  await expect(page.getByText("DRAFT STUDIO", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("provider keeps entered details when server validation fails", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Uses the rejected business fixture between review phases.",
  );
  await login(page, info.project.name);
  await page.getByRole("link", { name: "Edit and resubmit" }).click();
  await page
    .getByLabel("Workspace address or service area", { exact: false })
    .fill("New address preserved after validation");
  await page.getByLabel("Where do you provide services?").selectOption("mixed");
  await page.getByLabel("Hair", { exact: true }).uncheck();
  await page.getByLabel("I confirm these details", { exact: false }).check();
  await page
    .getByRole("button", { name: "Submit updated application" })
    .click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Your entered details have been kept",
  );
  await expect(page.locator("form").getByRole("alert")).toBeFocused();
  await expect(
    page.getByLabel("Workspace address or service area", { exact: false }),
  ).toHaveValue("New address preserved after validation");
  await expect(page.getByLabel("Where do you provide services?")).toHaveValue(
    "mixed",
  );
  await expect(page.getByLabel("Hair", { exact: true })).not.toBeChecked();
  await expect(page.locator("input[name=legal_name]")).toHaveValue(
    "Fixture Provider Legal Name",
  );
});
