# Reviewing provider applications in Supabase

Review is handled in the designated Supabase project. There is no app administrator account or review screen in this release.

1. Open the project’s **Table Editor → provider_applications** and filter `status` to `pending`.
2. Read the public name, contact person, phone, location/service area, services, experience and portfolio. Also review `legal_name`, `operating_status`, `contact_address`, `country_code` (GE), optional company registration code and qualification summary. `declaration_version` and `declaration_at` record the accuracy/authority declaration. Verify relevant public registry details and service-specific credentials as appropriate; self-declarations are not verification. Request an updated application if legacy identity/declaration fields are NULL. See [Georgia registration research and launch requirements](registration-research.md).
3. To approve, change **status** to **approved** and save. The database creates an owner workspace and a private draft studio in the same transaction. An individual professional also receives an active professional profile. Nothing is published automatically.
4. To reject, enter a clear **review_reason** of at least five characters, then set **status** to **rejected**. You may save the reason first and the status afterward, or update both together. Applicants see the reason and can edit and resubmit.

Only change the review reason and status when making a decision. Ownership, review timestamps and provisioning references are maintained automatically. A pending application is locked against applicant edits so the submitted details cannot change during review. After rejection, resubmission returns it to pending with a new revision. Prior decisions remain in `provider_application_reviews`.

Approval is final in this release. Suspending an already approved provider requires a separate workflow; changing an approved application’s status is blocked. This prevents accidentally leaving an active workspace attached to a rejected application.

Customer accounts do not appear in this queue and do not need team approval. Registration type stored in Auth metadata only helps navigation; it never grants provider access. Application and review tables use RLS, and applicants can read only their own records. Browser clients cannot approve, reject, forge decision records, or create business ownership.

Email confirmation/delivery settings still require deployed-environment verification. Reviews and status changes are shown in the app; automated decision emails are not implemented.
