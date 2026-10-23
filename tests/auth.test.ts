import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext, credentials } from "../src/lib/auth-validation.ts";

test("redirects stay on the application origin", () => {
  for (const value of [
    undefined,
    "",
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\nevil.test",
    "javascript:alert(1)",
  ])
    assert.equal(safeNext(value), "/account");
  assert.equal(safeNext("/account?tab=upcoming"), "/account?tab=upcoming");
  assert.equal(safeNext("/venues/studio-muse"), "/venues/studio-muse");
});
test("server credentials reject invalid or oversized values", () => {
  const form = new FormData();
  form.set("email", " user@example.invalid ");
  form.set("password", "long-password");
  assert.deepEqual(credentials(form), {
    email: "user@example.invalid",
    password: "long-password",
  });
  form.set("password", "short");
  assert.equal(credentials(form), null);
  form.set("password", "a".repeat(129));
  assert.equal(credentials(form), null);
  form.set("password", "long-password");
  form.set("email", "invalid");
  assert.equal(credentials(form), null);
});
