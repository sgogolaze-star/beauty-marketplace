# Policy drafts and release state

Prepared 28 October 2026 for the Georgia-first Bloom preview. The current Terms, Privacy notice and Provider Agreement are drafts in Georgian and English, available at `/legal/terms`, `/legal/privacy` and `/legal/providers`. Default language is Georgian; readers can switch to English. All pages are marked noindex and show an explicit draft banner. Registration and the footer link to them. No one is asked to agree to the current drafts.

## Current implementation

`src/content/legal-documents.json` contains the authored text and version. `src/content/legal-operator.json` intentionally leaves unverified controller identity, address/contact, purpose-specific processing basis, retention and transfer information empty. No company, email inbox, deletion schedule, transfer safeguard or professional review is invented.

The designated Supabase project has three **draft** `legal_documents` rows and no permanent test receipts. Their immutable text snapshots include the document and operator configuration. PostgreSQL checks the SHA-256 digest against the exact stored UTF-8 text. Published/retired snapshots cannot be edited or deleted through normal operations; new text requires a new version. A partial unique index permits one currently published version per document kind. Retired versions remain readable through version-specific links.

The authenticated `record_legal_receipts` RPC records only the caller, current published versions, verified document hashes, language, server time, and `agreed` or `acknowledged`. Privacy notice acknowledgement is separate from Terms/Provider Agreement acceptance; it is not marketing consent. Receipts are idempotent, private under RLS, and not directly client-writable. Supplied identity/time fields cannot forge the actor or timestamp. Server Actions reject changed displayed versions/hashes before recording. Metadata never grants provider access.

With published documents, the database checks current receipts before a provider application/resubmission, studio publication, and a new booking (both customer and provider). Existing booking cancellation is not gated on accepting changed terms. New-account confirmation and relevant app forms route to `/legal/accept` when finalized policies are active. While all documents remain drafts, these checks allow the existing preview but capture no draft consent.

The Vercel production build guard rejects incomplete operator configuration, absent review and draft documents. Preview/local builds remain available. Passing that guard is a technical prerequisite, not legal certification or authorization to deploy production.

## Finalization sequence

1. Confirm the actual operator identity/address/contact and settle the outstanding policy choices in the draft text. Confirm the real provider/marketplace contractual roles, Georgian wording, service-specific requirements, notices before booking, cancellation/withdrawal handling, durable confirmation and account lifecycle processes. Source research is in `registration-research.md`.
2. Complete the operator configuration and review record, replace unresolved draft language, assign new final versions, and set the reviewed source documents to `published`. Generate fresh snapshots/hashes. Never change an already published version's content or operator snapshot.
3. Prepare a reviewed migration that retires old versions and inserts the final snapshots as published in one transaction. Do not activate only part of the three-document set. Synchronize the application version and database together in an isolated/staging environment and verify the active browser flow before a public release.
4. Re-run unit/browser/SQL checks, including stale-page rejection, signed-in agreement capture in both languages, provider requirements, old-version retrieval, and cancellation without renewed acceptance. Then obtain production approval separately.

The live acceptance browser branch is intentionally inactive in this preview and has not been exercised with real finalized policies. Its database security and version checks are covered by transactional tests that roll back. Draft-page/browser navigation and existing registration are verified separately. Email inbox delivery, password recovery, deletion/retention automation and policy activation remain incomplete.

## Primary sources reviewed

- [Georgia Personal Data Protection Law](https://matsne.gov.ge/en/document/view/5827307): used to identify unresolved collection-notice and processing details.
- [Georgia Consumer Rights Law](https://matsne.gov.ge/en/document/view/5420598): used to identify the outstanding trader disclosures and booking-contract work.

These are working drafts for review, not a representation that the marketplace is compliant or ready for public launch.
