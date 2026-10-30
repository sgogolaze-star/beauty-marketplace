"use server";
import { agreementDestination } from "@/lib/legal-server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { credentials, safeNext } from "@/lib/auth-validation";
import { authOrigin } from "@/lib/auth-origin";
import {
  registrationType,
  registrationDestination,
} from "@/lib/provider-validation";

export async function authenticate(form: FormData) {
  const mode = form.get("mode") === "signup" ? "signup" : "login";
  const next = safeNext(String(form.get("next") ?? ""));
  const input = credentials(form);
  const kind = registrationType(form.get("registration_kind"));
  const fail = (message: string): never =>
    redirect(
      `/login?mode=${mode}&as=${kind}&next=${encodeURIComponent(next)}&message=${encodeURIComponent(message)}`,
    );
  if (!input)
    fail("Enter a valid email and a password between 8 and 128 characters.");
  if (!hasSupabase())
    fail("Account access is not configured yet. Please try again later.");
  const supabase = await createClient();
  if (mode === "signup") {
    const fullName = String(form.get("full_name") ?? "").trim();
    if (fullName.length < 2 || fullName.length > 100)
      fail("Enter your name using 2 to 100 characters.");
    let origin: string;
    try {
      origin = await authOrigin();
    } catch {
      fail(
        "Account email links are not configured yet. Please try again later.",
      );
    }
    const { data, error } = await supabase.auth.signUp({
      ...input!,
      options: {
        emailRedirectTo: `${origin!}/auth/callback?next=${encodeURIComponent(next)}`,
        data: { registration_kind: kind, full_name: fullName },
      },
    });
    if (error)
      fail("We could not create your account. Please try again later.");
    if (!data.session)
      fail("Check your email to confirm your account, then sign in.");
    const destination = registrationDestination(kind, next);
    redirect(
      await agreementDestination(
        supabase,
        data.user!.id,
        destination,
        kind !== "customer",
      ),
    );
  } else {
    const { data, error } = await supabase.auth.signInWithPassword(input!);
    if (error)
      fail(
        "Sign-in failed. Check your email and password, or confirm your email first.",
      );
    redirect(
      registrationDestination(
        data.user?.user_metadata?.registration_kind,
        next,
      ),
    );
  }
  redirect(next);
}
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error)
    redirect("/account?message=Sign-out%20failed.%20Please%20try%20again.");
  redirect("/");
}
