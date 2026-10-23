# Registration decisions for a Georgia launch

Reviewed 23 October 2026. Implementation research and a prelaunch plan, not a legal compliance certification.

## Implemented flow

The header has adjacent Sign in / Sign up links. Signup asks for full name, email and password. Customer, Business and Individual professional appear as a segmented choice with native radio semantics, keyboard support, and no page reload or loss of typed credentials. Workspace type describes how someone offers services; it does not determine legal operating status or grant permissions.

Customers proceed after email confirmation. Providers see Account → Application → Review, then supply contact details, location/service area, services, experience and description. The separate identity section asks for operating status, legal provider name, a contact address, and Georgia as country. A public company registration code is optional and shown only for companies. Individual entrepreneur and individual applicants are not asked for personal identification numbers. Relevant qualifications/registrations can be described optionally without uploads. These are platform review fields, not a statement that every field is legally mandatory for every applicant.

The required accuracy/authority declaration has a database-set version and timestamp. It is not acceptance of marketplace Terms or blanket privacy consent. Identity/address fields remain private under application RLS. Approval in Supabase creates only a private draft and does not imply a government licence or verified qualifications.

## Research behind the design

- [Fresha business setup](https://www.fresha.com/help-center/academy/launch-your-workspace/getting-started/lessons/100244) separates business setup and ongoing workspace details. This supports keeping account creation short and collecting provider details in context.
- [W3C form grouping](https://www.w3.org/WAI/tutorials/forms/grouping/) recommends fieldsets/legends for radio groups. The selector looks like tabs but is a form choice with native radio behavior.
- [Stripe verification guidance](https://docs.stripe.com/connect/identity-verification) distinguishes incremental and upfront onboarding; requirements depend on country, entity and payment capabilities. This is a design reference, not a selected payment integration or evidence of availability in Georgia. Appointments are paid at the studio, so payment KYC/bank/beneficial-owner documents are deferred to a future supported payment provider.

## Georgia findings and launch requirements

[Georgia's Personal Data Protection Law](https://matsne.gov.ge/en/document/view/5827307), Articles 4, 12 and 24, addresses necessary data collection and notice. A complete collection notice needs the real controller identity/contact, purposes/legal basis, required/optional status, recipients, retention, rights and applicable transfer information. No marketing opt-in or marketing processing was added. Future marketing needs separate consent, evidence and withdrawal; do not bundle it with registration.

[Georgia's Consumer Rights Law](https://matsne.gov.ge/en/document/view/5420598), Articles 5 and 10–13, addresses trader identity/contact, Georgian-language precontract information, price/payment, distance-contract confirmation and withdrawal. Collecting identity prepares for those disclosures; it does not implement them. Before launch, determine marketplace/provider contractual roles, show appropriate trader identity/contact before booking, and review cancellation/withdrawal handling and durable confirmations. Do not simply label every booking non-refundable or exempt.

Before production: supply the operating legal entity name, address and support/privacy contact; finalize Terms, Privacy notice, provider agreement and cancellation policy; approve Georgian wording; establish retention/deletion and cross-border processing arrangements; verify email delivery and recovery. Then implement versioned agreement acceptance with server timestamps against finalized documents. A generic checkbox cannot replace missing information. Assess registration, credentials, licensing and insurance by service category; do not invent a universal beauty-service licence requirement.

Current short data-use notices are not a complete Article 24 notice. Legacy applications retain NULL identity/declaration fields instead of invented values; reviewers must obtain missing information before approval. Provider suspension is not implemented.
