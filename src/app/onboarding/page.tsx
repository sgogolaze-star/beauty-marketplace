import { agreementDestination } from "@/lib/legal-server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { registrationType } from "@/lib/provider-validation";
import { ProviderForm } from "@/components/provider-form";
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
  const legalNext = await agreementDestination(
    supabase,
    user.id,
    "/onboarding",
    true,
  );
  if (legalNext !== "/onboarding") redirect(legalNext);
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
            })}
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
          <ProviderForm
            application={application}
            initialKind={kind}
            defaultContactName={
              typeof user.user_metadata?.full_name === "string"
                ? user.user_metadata.full_name.slice(0, 100)
                : ""
            }
          />
        </section>
      )}
    </main>
  );
}
