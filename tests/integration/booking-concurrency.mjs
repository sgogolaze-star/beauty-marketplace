// Run only against disposable fixtures after booking-flow.spec.ts sets up the studio.
// node --env-file=.env.local --env-file=.env.test.local tests/integration/booking-concurrency.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (
  !url ||
  !key ||
  !process.env.BLOOM_TEST_EMAIL ||
  !process.env.BLOOM_OTHER_EMAIL ||
  !process.env.BLOOM_TEST_PASSWORD
)
  throw new Error("Disposable test environment required");
const clients = [
  createClient(url, key, { auth: { persistSession: false } }),
  createClient(url, key, { auth: { persistSession: false } }),
];
try {
  for (const [i, email] of [
    process.env.BLOOM_TEST_EMAIL,
    process.env.BLOOM_OTHER_EMAIL,
  ].entries()) {
    const { error } = await clients[i].auth.signInWithPassword({
      email,
      password: process.env.BLOOM_TEST_PASSWORD,
    });
    assert.equal(error, null, "Fixture login failed");
  }
  const { data: venue, error: venueError } = await clients[0]
    .from("venues")
    .select("id")
    .eq("slug", "booking-e2e-desktop")
    .single();
  assert.equal(venueError, null);
  const { data: service, error: serviceError } = await clients[0]
    .from("services")
    .select("*")
    .eq("venue_id", venue.id)
    .single();
  assert.equal(serviceError, null);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 3 * 86400000));
  const { data: slots, error: slotError } = await clients[0].rpc(
    "list_booking_slots",
    { p_service_id: service.id, p_day: day },
  );
  assert.equal(slotError, null);
  assert.equal(slots.length, 7);
  const args = {
    p_service_id: service.id,
    p_staff_id: slots[0].staff_id,
    p_starts_at: slots[0].starts_at,
    p_expected_price: service.price_minor,
    p_expected_duration: service.duration_minutes,
  };
  const requests = Array.from({ length: 6 }, (_, i) => ({
    ...args,
    p_request_id: randomUUID(),
    client: i % 2,
  }));
  const results = await Promise.all(
    requests.map(({ client, ...input }) =>
      clients[client].rpc("book_appointment", input),
    ),
  );
  const winners = results
    .map((r, i) => (!r.error ? i : -1))
    .filter((i) => i >= 0);
  assert.equal(winners.length, 1, "Exactly one competing request must succeed");
  for (const r of results.filter((r) => r.error))
    assert.equal(r.error.code, "23P01", "Losing requests must report overlap");
  const index = winners[0],
    client = clients[requests[index].client];
  const { client: ignoredClient, ...retryArgs } = requests[index];
  void ignoredClient;
  const retry = await client.rpc("book_appointment", retryArgs);
  assert.equal(retry.error, null);
  assert.equal(
    retry.data,
    results[index].data,
    "Retry must return original appointment",
  );
  const cancel = await client.rpc("cancel_appointment", {
    p_appointment_id: retry.data,
  });
  assert.equal(cancel.error, null);
  const after = await client.rpc("list_booking_slots", {
    p_service_id: service.id,
    p_day: day,
  });
  assert.equal(after.error, null);
  assert.equal(after.data.length, 7, "Cancellation must restore availability");
  console.log(
    "PASS: six simultaneous requests → one reservation, five overlap rejections; retry and cancellation verified.",
  );
} finally {
  await Promise.all(clients.map((c) => c.auth.signOut()));
}
