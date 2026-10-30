"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { emailAddress } from "@/lib/auth-validation";
import { authOrigin } from "@/lib/auth-origin";
import { hasSupabase } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
export async function requestPasswordReset(form: FormData) {
  const email = emailAddress(form.get("email"));
  if (!email) redirect("/forgot-password?notice=invalid");
  if (!hasSupabase()) redirect("/forgot-password?notice=unavailable");
  const jar = await cookies();
  const recent = Number(jar.get("bloom-reset-requested")?.value);
  const now = Math.floor(Date.now() / 1000);
  if (Number.isFinite(recent) && recent <= now && now - recent < 60)
    redirect("/forgot-password?notice=sent");
  let origin: string;
  try {
    origin = await authOrigin();
  } catch {
    redirect("/forgot-password?notice=unavailable");
  }
  const client = await createClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?flow=recovery`,
  });
  if (error)
    console.warn("Password recovery request failed", {
      code: error.code,
      status: error.status,
    });
  // UX cooldown only. Supabase Auth enforces the actual email/request rate limits.
  jar.set("bloom-reset-requested", String(now), {
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
  redirect("/forgot-password?notice=sent");
}
