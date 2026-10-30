import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validDay,
  localTimestamp,
  priceMinor,
  tbilisiDate,
} from "../src/lib/booking-validation.ts";
test("booking dates are strict and use Tbilisi time", () => {
  assert.equal(validDay("2028-02-29"), true);
  assert.equal(validDay("2027-02-29"), false);
  assert.equal(validDay("2026-02-31"), false);
  assert.equal(localTimestamp("2026-10-24T10:30"), "2026-10-24T06:30:00.000Z");
  assert.equal(localTimestamp("2026-10-24T24:00"), null);
  assert.equal(localTimestamp("2026-10-24T10:99"), null);
  assert.equal(tbilisiDate(new Date("2026-10-23T21:00:00Z")), "2026-10-24");
});
test("prices convert exactly and reject invalid inputs", () => {
  assert.equal(priceMinor("19.99"), 1999);
  assert.equal(priceMinor("0.29"), 29);
  assert.equal(priceMinor("20.1"), 2010);
  assert.equal(priceMinor("0"), 0);
  for (const value of ["-1", "1e3", "1.999", "1000001", "NaN", ""])
    assert.equal(priceMinor(value), null);
});
