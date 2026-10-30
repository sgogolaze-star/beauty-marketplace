import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { requestPasswordReset } from "./actions";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};
export default async function ForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const messages: Record<string, string> = {
    sent: "If an account exists for that email, a reset link will be sent when delivery is available. Check your inbox and spam folder. Wait a minute before trying again.",
    expired:
      "This reset link has expired, has already been used, or could not be verified. Request a new link below.",
    invalid: "Enter a valid email address.",
    unavailable:
      "Password recovery is not available right now. Please try again later.",
    failed:
      "We couldn’t finish updating your password. Request a new link and try a different password.",
  };
  return (
    <main className="recovery-wrap">
      <section className="auth-card recovery-card">
        <Link className="back" href="/login">
          ← Back to sign in
        </Link>
        <span className="eyebrow">A FRESH START</span>
        <h1>
          {notice === "sent" ? "Check your email." : "Forgot your password?"}
        </h1>
        <p>
          Enter the email you use for Bloom. Open the reset link in this browser
          to choose a new password.
        </p>
        {messages[notice ?? ""] && (
          <p className="notice" role="status">
            {messages[notice!]}
          </p>
        )}
        <form action={requestPasswordReset} className="stack">
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <SubmitButton>
            {notice === "sent" ? "Request another link" : "Send reset link"}
          </SubmitButton>
        </form>
        <p className="form-note">
          Reset links can be used once. If you opened one on a different browser
          or device, request another link here.
        </p>
      </section>
    </main>
  );
}
