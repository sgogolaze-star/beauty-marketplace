import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  documentHash,
  displayedPolicyMatches,
  legalDocuments,
  legalLocale,
  legalReadiness,
  legalText,
} from "../src/lib/legal.ts";
test("draft policies have both languages and cannot be treated as launch-ready", () => {
  assert.deepEqual(legalDocuments.map((doc) => doc.kind).sort(), [
    "privacy",
    "provider_terms",
    "terms",
  ]);
  assert.ok(legalReadiness().includes("legalName"));
  for (const doc of legalDocuments) {
    assert.equal(doc.status, "draft");
    assert.match(documentHash(doc), /^[0-9a-f]{64}$/);
    for (const locale of ["ka", "en"] as const)
      assert.ok(
        doc.titles[locale] &&
          doc.sections.every(
            (section) => section[locale].paragraphs.length > 0,
          ),
      );
  }
  assert.equal(legalLocale("unknown"), "ka");
  assert.match(
    legalText("Contact: {{contactEmail}}", "en"),
    /not yet supplied/,
  );
});
test("the production build gate rejects incomplete legal identity and drafts", () => {
  const production = spawnSync(
    process.execPath,
    ["scripts/check-production-readiness.mjs"],
    { encoding: "utf8", env: { ...process.env, VERCEL_ENV: "production" } },
  );
  assert.equal(production.status, 1);
  assert.match(
    production.stderr,
    /Production legal configuration is incomplete/,
  );
  const preview = spawnSync(
    process.execPath,
    ["scripts/check-production-readiness.mjs"],
    { encoding: "utf8", env: { ...process.env, VERCEL_ENV: "preview" } },
  );
  assert.equal(preview.status, 0);
});

test("a policy change between display and submission requires a new review", () => {
  const doc = legalDocuments[0];
  const form = new FormData();
  form.set("version_" + doc.kind, doc.version);
  form.set("hash_" + doc.kind, documentHash(doc));
  assert.equal(displayedPolicyMatches(form, doc), true);
  form.set("version_" + doc.kind, "old-version");
  assert.equal(displayedPolicyMatches(form, doc), false);
  form.set("version_" + doc.kind, doc.version);
  form.set("hash_" + doc.kind, "wrong-hash");
  assert.equal(displayedPolicyMatches(form, doc), false);
});
