import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  providerCategories,
  registrationType,
  workModes,
} from "@/lib/provider-validation";
import { SubmitButton } from "@/components/submit-button";
import { submitApplication } from "./actions";
export const dynamic = "force-dynamic";
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; edit?: string; notice?: string }>;
}) {
  const query = await searchParams;
  if (!hasSupabase()) redirect("/login?mode=signup");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fonboarding");
  const [applicationResult, businessResult] = await Promise.all([
    supabase
      .from("provider_applications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("businesses").select("id").eq("owner_id", user.id).limit(1),
  ]);
  if (applicationResult.error || businessResult.error)
    throw new Error("Unable to load registration");
  const application = applicationResult.data;
  if (application?.status === "approved" || businessResult.data?.length)
    return (
      <main className="page-shell">
        <span className="eyebrow">YOU’RE APPROVED</span>
        <h1>Welcome to your next chapter.</h1>
        <div className="empty">
          <h2>Your provider workspace is ready.</h2>
          <p>
            Your draft studio is private until you publish it. Add your
            treatments, professionals and availability to start receiving
            bookings.
          </p>
          <Link className="button" href="/business">
            Open provider workspace ↗
          </Link>
        </div>
      </main>
    );
  const selected = registrationType(
    query.type ??
      application?.provider_type ??
      user.user_metadata?.registration_kind,
  );
  const kind = selected === "customer" ? "business" : selected;
  const showForm =
    !application || (application.status === "rejected" && query.edit === "1");
  return (
    <main className="page-shell onboarding-shell">
      <Link className="back" href="/account">
        ← My account
      </Link>
      <span className="eyebrow">
        PROVIDER REGISTRATION · REVIEW BEFORE PUBLISHING
      </span>
      <h1>
        {kind === "professional"
          ? "Your work deserves a space."
          : "Bring your business to Bloom."}
      </h1>
      <p>
        Tell us about your services. Our team will review your application
        before provider tools become available.
      </p>
      {query.notice === "invalid" && (
        <p className="notice" role="alert">
          Check the required fields, select at least one service, and confirm
          your details.
        </p>
      )}
      {query.notice === "failed" && (
        <p className="notice" role="alert">
          We couldn’t submit your application. Please try again.
        </p>
      )}
      {application && (
        <section className={`application-status status-${application.status}`}>
          <span className="eyebrow">APPLICATION STATUS</span>
          <h2>
            {application.status === "pending"
              ? "Under review"
              : "Changes needed"}
          </h2>
          <p>
            {application.status === "pending"
              ? "Your application is with our team. Details are locked during review. You can still book services as a customer."
              : "Your application was not approved. Review the reason below, update your information and submit it again."}
          </p>
          {application.status === "rejected" && (
            <p className="review-reason">
              <strong>Reason:</strong> {application.review_reason}
            </p>
          )}
          <p className="muted-small">
            Submitted{" "}
            {new Date(application.submitted_at).toLocaleDateString("en-GB", {
              timeZone: "Asia/Tbilisi",
            })}{" "}
            · Application version {application.revision}
          </p>
          {!showForm && application.status === "rejected" && (
            <Link className="button secondary" href="/onboarding?edit=1">
              Edit and resubmit
            </Link>
          )}
        </section>
      )}
      {showForm && (
        <section className="provider-form-panel">
          <nav className="registration-choices" aria-label="Provider type">
            <Link
              className={kind === "business" ? "selected" : ""}
              href="/onboarding?type=business&edit=1"
            >
              Business
            </Link>
            <Link
              className={kind === "professional" ? "selected" : ""}
              href="/onboarding?type=professional&edit=1"
            >
              Individual professional
            </Link>
          </nav>
          <form action={submitApplication} className="stack provider-form">
            <input type="hidden" name="provider_type" value={kind} />
            <label>
              {kind === "business"
                ? "Business or studio name"
                : "Professional display name"}
              <input
                name="public_name"
                required
                minLength={2}
                maxLength={150}
                defaultValue={application?.public_name ?? ""}
              />
            </label>
            <label>
              {kind === "business"
                ? "Contact person’s full name"
                : "Your full name"}
              <input
                name="contact_name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={application?.contact_name ?? ""}
              />
            </label>
            <label>
              Phone number
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={26}
                placeholder="+995 …"
                defaultValue={application?.phone ?? ""}
              />
            </label>
            <label>
              City
              <input
                name="city"
                autoComplete="address-level2"
                required
                minLength={2}
                maxLength={100}
                defaultValue={application?.city ?? ""}
              />
            </label>
            <label>
              Where do you provide services?
              <select
                name="work_mode"
                defaultValue={
                  application?.work_mode ??
                  (kind === "business" ? "studio" : "mobile")
                }
              >
                {Object.entries(workModes).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Workspace address or service area
              <input
                name="address_or_area"
                required
                minLength={5}
                maxLength={300}
                defaultValue={application?.address_or_area ?? ""}
              />
              <small>
                Give your workspace address, or the areas you travel to. This
                contact information is private to you and our review team.
              </small>
            </label>
            <fieldset className="category-checks">
              <legend>Services you provide</legend>
              {providerCategories.map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    name="service_categories"
                    value={category}
                    defaultChecked={
                      application?.service_categories.includes(category) ??
                      false
                    }
                  />
                  {category}
                </label>
              ))}
            </fieldset>
            <label>
              Years of professional experience
              <input
                name="experience_years"
                type="number"
                required
                min={0}
                max={80}
                defaultValue={application?.experience_years ?? 0}
              />
            </label>
            <label>
              About your services
              <textarea
                name="description"
                required
                minLength={30}
                maxLength={3000}
                defaultValue={application?.description ?? ""}
              />
              <small>
                At least 30 characters. This description will be copied to your
                private draft studio if approved.
              </small>
            </label>
            <label>
              Website or portfolio link (optional)
              <input
                name="portfolio_url"
                type="url"
                placeholder="https://…"
                maxLength={500}
                defaultValue={application?.portfolio_url ?? ""}
              />
            </label>
            {kind === "business" && (
              <label>
                Business registration number (optional)
                <input
                  name="registration_number"
                  maxLength={64}
                  defaultValue={application?.registration_number ?? ""}
                />
              </label>
            )}
            <label className="consent-check">
              <input type="checkbox" name="details_confirmed" required />I
              confirm these details are accurate and I’m authorised to offer the
              services listed.
            </label>
            <p className="muted-small">
              Your application is private. Submission does not publish a listing
              or guarantee approval. Our team’s decision and any rejection
              reason will appear here.
            </p>
            <SubmitButton>
              {application ? "Submit updated application" : "Submit for review"}
            </SubmitButton>
          </form>
        </section>
      )}
    </main>
  );
}
