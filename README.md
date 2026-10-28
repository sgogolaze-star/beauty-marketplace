# Beauty Marketplace · Bloom

An initial Next.js App Router foundation for a beauty and wellness marketplace. Bloom is a provisional original design informed by Fresha discovery patterns, not a copy of its brand or assets.

## Implemented

- Responsive discovery, treatment and city filters, studio details, useful empty/error states, and accessible account forms.
- Supabase SSR email/password sign-in, sign-up, code exchange and email confirmation handlers, cookie refresh, verified server-side account access, and sign-out. Auth responses use private/no-store caching.
- Twelve database tables: profiles, businesses, venues, services, staff, appointments, staff_services, availability, provider_applications, provider_application_reviews, legal_documents, and legal_receipts. Every table has RLS. Business ownership comes from trusted application approval, never editable signup metadata.
- Published venues and active services/staff are public. Customers read their own appointments and profiles. Owners manage only their businesses' catalog and read their businesses' appointments.
- Generated database types, exact dependency versions, lockfile, unit tests, browser tests, transactional RLS tests, and CI.
- Approved owners can create/publish studios, add or hide treatments/professionals, assign treatments to professionals, add dated availability, and view/cancel upcoming appointments in `/business`.
- Customers can choose a treatment, date, professional and time, confirm a pay-at-studio appointment, and cancel before it starts. `/book/[serviceId]` requires sign-in and shows only available slots.
- Database-enforced overlap exclusion, server-set price/duration snapshots, stale-price checks, idempotent retries, a 30-minute lead time, 90-day booking horizon, and 10-upcoming-appointment customer limit. Direct appointment table writes remain revoked.
- Adjacent Sign in / Sign up entry points and keyboard-accessible segmented account choices preserve entered details. Signup collects name/email/password; providers complete private contact, services and legal identity sections for the Georgia launch, with server-recorded declarations. See [registration research and remaining legal launch requirements](docs/registration-research.md).
- Registration offers Customer, Business, and Individual professional paths. Providers complete a private application after account confirmation/sign-in. Customers do not need team approval.
- Provider applications are reviewed in Supabase Table Editor. Approval automatically provisions an owner workspace and private draft studio; individual professionals also receive a professional profile. Rejections require a reason and allow resubmission. Pending details are locked during review. See [provider review guide](docs/provider-review.md).

- Georgian/English Terms, Privacy and Provider Agreement drafts are linked from signup/footer. Versioned, private legal receipts and immutable policy snapshots are implemented, with current-policy checks at the database mutation boundary. Drafts cannot be accepted. A production build guard blocks incomplete operator identity and draft publication. See [policy release state and activation guide](docs/legal-release.md).

## Scope and limitations

This is an initial booking release, not a completed marketplace. Online payments, notifications, an app-based administrator review screen, provider suspension, account deletion, recurring schedules, rescheduling, refunds and cancellation-fee rules remain future work. Provider decisions are handled in Supabase for now. Payment is due at the studio; no charge is taken online. Cancellation is allowed until the appointment starts. Availability uses dated windows, not recurring weekly rules.

Password recovery uses Supabase PKCE with a verified recovery session, a 15-minute single-use database permission, password confirmation and sign-out after success. See [recovery flow, verification and email delivery limitations](docs/password-recovery.md). The Auth service and app flow were tested with disposable accounts; real inbox delivery remains unverified.

Appointment table writes remain denied to API clients. The only mutation boundary is the authenticated booking/cancellation API, which validates identity, ownership/publication, assignments, current price and duration, and availability in the database. Privileged helpers live in the non-exposed `booking_private` schema with an empty search path, explicit execute grants, and identity checks. Public wrappers run as the caller. Staff row locks serialize booking/cancellation/window removal; an exclusion constraint independently rejects overlapping confirmed reservations. Do not grant direct appointment writes.

The three fictional preview studios are shown only when the catalog is empty or Supabase is not configured. Preview records are visibly labeled and cannot be booked. No sample studios or customers are permanently seeded into Supabase. The three preview slugs are reserved by a database constraint to avoid collisions.

The first release supports GEL prices and Asia/Tbilisi time. Extend validation and display together before supporting other currencies/timezones. Catalog search currently filters the published catalog in memory; add server pagination/search before catalog growth.

## Local development

Requires Node 22.21+ (Node 24 also supported) and npm.

```sh
npm ci --ignore-scripts
cp .env.example .env.local
# Set your own Supabase URL and publishable key in .env.local.
npm run dev
```

Only a publishable key is required. Never add a service-role key, database password, access token, or secret key to browser configuration. All environment files except the placeholder example are ignored. Vercel configuration is scoped to preview/development; production deployment requires explicit approval.

## Supabase migrations

`supabase/migrations` matches the ten migrations applied to the designated project. Use these files to initialize an empty environment; do not reapply them manually to an already migrated database. CLI migration generation was verified with Supabase CLI 2.81.3. The hosted migration history remains the source of truth for applied versions.

Businesses are provisioned automatically when a trusted operator approves a pending application in Supabase. Applicants cannot write review status or business ownership. The private trigger provisions records atomically; public submission runs through an authenticated wrapper and private identity-checked helper. Registration metadata is a navigation hint only. Applicants can read only their own application and review records. Profiles can be created/updated only by their own user; profile IDs are immutable through the Data API.

For sign-up email delivery, configure the deployed origin in Supabase Auth Site URL/redirect allowlist and set up delivery appropriate for your release. The `/auth/callback` route exchanges PKCE codes. A custom confirmation email can use `/auth/confirm?token_hash={{ .TokenHash }}&type=email`. Inbox delivery and deployed-origin email redirects have not been verified. Password sign-in, cookie persistence, and sign-out were verified with a disposable confirmed test account.

## Verification

```sh
npm run lint
npm run test
npm run build
npm run typecheck
npm run test:e2e
```

Browser tests use installed Edge locally. On Linux/CI, install Playwright Chromium and set `PLAYWRIGHT_CHANNEL=chromium`. The CI preview-mode tests need no credentials. The authenticated browser test requires `BLOOM_TEST_EMAIL` and `BLOOM_TEST_PASSWORD` for a disposable confirmed account and otherwise skips. Do not use real customer credentials or commit test credentials. Test traces are disabled to avoid capturing sessions.

The optional booking browser test additionally needs `BLOOM_OWNER_EMAIL` and an operator-provisioned disposable business. It creates studios/treatments/professionals/availability through the UI, books as a customer, checks reserved times disappear, rejects removal of a window with bookings, cancels, and verifies the time is released. Run these fixture tests separately from preview-catalog tests. Remove all disposable data afterward.

`tests/integration/booking-concurrency.mjs` races six authenticated API calls for one slot, requires exactly one success and five overlap rejections, retries the winning request without duplication, then cancels. It needs `BLOOM_OTHER_EMAIL` plus the disposable browser-test setup and a seven-slot availability window three days ahead. Run with Node's `--env-file=.env.local --env-file=.env.test.local`; never use real customer accounts.

`tests/db/rls.sql` creates transactional fixtures, asserts anonymous/customer/owner isolation, checks reassignment denial and fail-closed appointment writes, and rolls back. It was executed successfully on the designated Supabase project. `tests/db/bootstrap.sql` is only a minimal Supabase role shim for an isolated plain Postgres CI container; never run that shim on Supabase.

`tests/db/booking.sql` adds transactional assertions for valid booking, retry idempotency, forged price/duration rejection, assignment checks, booking horizon and slot alignment, overlap/adjacent reservations, cross-customer cancellation denial, cancellation release, and protected availability removal. CI runs both SQL suites in isolated Postgres.

`tests/db/providers.sql` verifies privacy, denied self-approval, locked pending applications, rejection reasons, resubmission history and atomic business/solo provisioning. CI runs this suite too. Optional phased provider browser tests require disposable confirmed business/professional accounts and Supabase-side decisions between phases; no application admin secret is introduced. Actual signup email delivery remains unverified. Provider status is read on page load; automatic decision emails are not implemented.

Runtime dependency audit: zero vulnerabilities at verification. Full audit: five high-severity dependency-chain entries from the same unpatched `braces` advisory, GHSA-vfj7-8cjw-p6xm, via Next's ESLint tooling. These affect developer glob processing, not the deployed application runtime. No safe patched version was available; npm's suggested forced fix downgrades Next lint tooling across major versions. Review dependency advisories before release and do not lint untrusted glob patterns.

Latest Supabase advisor results: no performance findings. An informational no-policy notice for the deliberately inaccessible `recovery_private.used_sessions` table is expected. One Auth setting warning remains: leaked-password protection is disabled. Review [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) before launch; no account plan or authentication settings were changed during this implementation.

## UX references

- [Fresha treatment discovery on Mobbin](https://mobbin.com/screens/0b68f8e9-3c79-4302-83c6-990eefc611d7)
- [Fresha location search on Mobbin](https://mobbin.com/screens/07f1acb1-7f36-499f-8411-8c9a2f31bb3d)
- [Fresha nearby venues on Mobbin](https://mobbin.com/screens/c3bc9536-c28c-4cf5-bb25-bca324c344c8)
- [Fresha time selection on Mobbin](https://mobbin.com/screens/9b43fe75-dae4-4265-88f0-11d5203e3d14)

The illustrations are original CSS artwork; no Mobbin screenshots or third-party brand assets ship with this project.
