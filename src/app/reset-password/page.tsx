import type { Metadata } from "next";
import Link from "next/link";
import { hasSupabase } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { updateRecoveredPassword } from "./actions";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  let eligible = false;
  if (hasSupabase()) {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user) {
      const { data, error } = await client.rpc("password_recovery_status");
      eligible = !error && data === true;
    }
  }
  return (
    <main className="recovery-wrap">
      <section className="auth-card recovery-card">
        <Link className="back" href="/login">
          ← Back to sign in
        </Link>
        <span className="eyebrow">YOUR ACCOUNT, SECURELY</span>
        <h1>
          {eligible ? "Choose a new password." : "Let’s get you a fresh link."}
        </h1>
        {eligible ? (
          <>
            <p>
              Choose a password with 8–128 characters. This reset permission
              expires 15 minutes after verification. You’ll sign in again
              afterward.
            </p>
            {notice === "invalid" && (
              <p className="notice" role="status">
                Use 8–128 characters and enter the same password in both fields.
              </p>
            )}
            <form action={updateRecoveredPassword} className="stack">
              <label>
                New password
                <input
                  required
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                />
              </label>
              <label>
                Confirm new password
                <input
                  required
                  name="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                />
              </label>
              <SubmitButton>Update password</SubmitButton>
            </form>
          </>
        ) : (
          <>
            <p>
              This page needs a fresh, verified recovery link. A regular sign-in
              session, expired link or used link cannot reset your password
              here.
            </p>
            <Link className="button" href="/forgot-password">
              Request a new reset link
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
