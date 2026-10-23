# Beauty Marketplace · Bloom

An initial Next.js App Router foundation for a beauty and wellness marketplace. Bloom is a provisional original design informed by Fresha discovery patterns, not a copy of its brand or assets.

## Implemented

- Responsive discovery, treatment and city filters, studio details, useful empty/error states, and accessible account forms.
- Supabase SSR email/password sign-in, sign-up, code exchange and email confirmation handlers, cookie refresh, verified server-side account access, and sign-out. Auth responses use private/no-store caching.
- Six database tables: profiles, businesses, venues, services, staff, and appointments. Every table has RLS. Business ownership comes from operator-provisioned database records, never editable signup metadata.
- Published venues and active services/staff are public. Customers read their own appointments and profiles. Owners manage only their businesses' catalog and read their businesses' appointments.
- Generated database types, exact dependency versions, lockfile, unit tests, browser tests, transactional RLS tests, and CI.

## Scope and limitations

This is the foundation, not a completed booking marketplace. Scheduling, availability, overlap-safe appointment creation, cancellation, payments, notifications, owner onboarding UI, password recovery, and account deletion are future work. Appointment writes are deliberately denied to API clients until a transactional scheduling API exists. Do not enable write grants alone.

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

`supabase/migrations` matches the two migrations applied to the designated project. Use these files to initialize an empty environment; do not reapply them manually to an already migrated database. CLI migration generation was verified with Supabase CLI 2.81.3. The hosted migration history remains the source of truth for applied versions.

Businesses are provisioned by a trusted operator after approval. Customers cannot create businesses or change their ownership. Profiles can be created/updated only by their own user; profile IDs are immutable through the Data API.

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

`tests/db/rls.sql` creates transactional fixtures, asserts anonymous/customer/owner isolation, checks reassignment denial and fail-closed appointment writes, and rolls back. It was executed successfully on the designated Supabase project. `tests/db/bootstrap.sql` is only a minimal Supabase role shim for an isolated plain Postgres CI container; never run that shim on Supabase.

Runtime dependency audit: zero vulnerabilities at verification. Full audit: five high-severity dependency-chain entries from the same unpatched `braces` advisory, GHSA-vfj7-8cjw-p6xm, via Next's ESLint tooling. These affect developer glob processing, not the deployed application runtime. No safe patched version was available; npm's suggested forced fix downgrades Next lint tooling across major versions. Review dependency advisories before release and do not lint untrusted glob patterns.

Supabase security advisor: zero findings. Performance advisor: only informational unused indexes on the new empty catalog; retain these ownership/foreign-key lookup indexes as real traffic begins.

## UX references

- [Fresha treatment discovery on Mobbin](https://mobbin.com/screens/0b68f8e9-3c79-4302-83c6-990eefc611d7)
- [Fresha location search on Mobbin](https://mobbin.com/screens/07f1acb1-7f36-499f-8411-8c9a2f31bb3d)
- [Fresha nearby venues on Mobbin](https://mobbin.com/screens/c3bc9536-c28c-4cf5-bb25-bca324c344c8)

The illustrations are original CSS artwork; no Mobbin screenshots or third-party brand assets ship with this project.
