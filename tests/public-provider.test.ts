import { test } from "node:test";
import assert from "node:assert/strict";
import { publicContact } from "../src/lib/provider-public.ts";
test("public contacts require an explicit declaration and safe bounded fields", () => {
  const form = new FormData();
  form.set("contact_email", " public@example.invalid ");
  form.set("contact_phone", "+995 555 000 123");
  form.set("contact_address", "Public Studio Street 10");
  assert.equal(publicContact(form), null);
  form.set("public_confirmed", "on");
  assert.equal(publicContact(form)?.contact_email, "public@example.invalid");
  for (const [key, value] of [
    ["contact_email", "public@example.invalid?subject=x"],
    ["contact_phone", "javascript:alert(1)"],
    ["contact_address", "short".repeat(100)],
  ]) {
    const copy = new FormData();
    for (const [name, item] of form) copy.set(name, item);
    copy.set(key, value);
    // Email syntax must also be safe in mailto links.
    assert.equal(publicContact(copy), null);
  }
});
