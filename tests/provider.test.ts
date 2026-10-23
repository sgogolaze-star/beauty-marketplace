import { test } from "node:test";
import assert from "node:assert/strict";
import {
  providerDetails,
  registrationDestination,
  registrationType,
} from "../src/lib/provider-validation.ts";
function valid() {
  const f = new FormData();
  for (const [key, value] of Object.entries({
    provider_type: "business",
    legal_name: "Fixture Studio LLC",
    contact_address: "Fixture street 10, Tbilisi",
    operating_status: "company",
    public_name: "Bloom studio",
    contact_name: "Test applicant",
    phone: "+995 555 123 456",
    city: "Tbilisi",
    address_or_area: "Vake neighbourhood",
    work_mode: "studio",
    experience_years: "5",
    description:
      "A small independent studio offering thoughtful hair and skin treatments.",
    details_confirmed: "on",
  }))
    f.set(key, value);
  f.append("service_categories", "Hair");
  return f;
}
test("registration choice is a navigation hint, never an arbitrary role", () => {
  assert.equal(registrationType("admin"), "customer");
  assert.equal(
    registrationDestination("business"),
    "/onboarding?type=business",
  );
  assert.equal(
    registrationDestination("professional"),
    "/onboarding?type=professional",
  );
  assert.equal(registrationDestination("customer"), "/account");
  assert.equal(
    registrationDestination("professional", "/book/service"),
    "/book/service",
  );
});
test("provider application validates contact, services, experience and consent", () => {
  assert.equal(providerDetails(valid())?.phone, "+995 555 123 456");
  for (const [key, value] of [
    ["phone", "invalid"],
    ["legal_name", ""],
    ["contact_address", "x"],
    ["operating_status", "admin"],
    ["experience_years", "-1"],
    ["experience_years", "81"],
    ["provider_type", "admin"],
    ["description", "Too short"],
    ["details_confirmed", ""],
  ]) {
    const f = valid();
    f.set(key, value);
    assert.equal(providerDetails(f), null, key);
  }
  const f = valid();
  f.delete("service_categories");
  assert.equal(providerDetails(f), null);
  f.append("service_categories", "Unknown");
  assert.equal(providerDetails(f), null);
});
test("portfolio is optional and only secure links without embedded credentials are accepted", () => {
  for (const value of [
    "http://example.com",
    "javascript:alert(1)",
    "https://name:password@example.com",
  ]) {
    const f = valid();
    f.set("portfolio_url", value);
    assert.equal(providerDetails(f), null);
  }
  const f = valid();
  f.set("portfolio_url", "https://example.com/portfolio");
  assert.ok(providerDetails(f));
});

test("individuals are never asked to submit a personal identification number", () => {
  const f = valid();
  f.set("operating_status", "individual");
  f.set("registration_number", "12345678901");
  assert.equal(providerDetails(f), null);
  f.delete("registration_number");
  assert.equal(providerDetails(f)?.country_code, "GE");
});
