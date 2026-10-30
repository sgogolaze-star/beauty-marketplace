import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext, credentials, emailAddress, replacementPassword, trustedAuthOrigin } from "../src/lib/auth-validation.ts";

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

test("recovery validates email and matching bounded passwords", () => {
  assert.equal(emailAddress(" user@example.invalid "), "user@example.invalid");
  for (const value of [null, "", "invalid", "a@b", "a b@example.invalid", "a".repeat(255) + "@example.invalid"])
    assert.equal(emailAddress(value), null);
  const form = new FormData();
  for (const password of ["short", "x".repeat(129)]) {
    form.set("password", password);
    form.set("password_confirmation", password);
    assert.equal(replacementPassword(form), null);
  }
  form.set("password", "a-valid-password");
  form.set("password_confirmation", "different-password");
  assert.equal(replacementPassword(form), null);
  form.set("password_confirmation", "a-valid-password");
  assert.equal(replacementPassword(form), "a-valid-password");
});

test("recovery redirects use configured origins and reject hostile request origins", () => {
  const options = { configured: "https://bloom.example", deployment: "preview.vercel.app", allowLocal: false };
  assert.equal(trustedAuthOrigin("https://preview.vercel.app", options), "https://preview.vercel.app");
  for (const value of ["https://evil.example", "http://localhost:3000", "https://bloom.example@evil.example", "https://bloom.example/path", null])
    assert.equal(trustedAuthOrigin(value, options), "https://bloom.example");
  assert.equal(trustedAuthOrigin("https://evil.example", { allowLocal: false }), null);
  assert.equal(trustedAuthOrigin("http://localhost:3012", { allowLocal: true }), "http://localhost:3012");
  for (const configured of ["http://bloom.example", "https://user:secret@bloom.example", "https://bloom.example?x=1", "https://bloom.example#x"])
    assert.equal(trustedAuthOrigin(null, { configured, allowLocal: false }), null);
});
