"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { replacementPassword } from "@/lib/auth-validation";
export async function updateRecoveredPassword(form: FormData) {
  if (!hasSupabase()) redirect("/forgot-password?notice=unavailable");
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/forgot-password?notice=expired");
  const password = replacementPassword(form);
  if (!password) redirect("/reset-password?notice=invalid");
  const { error: permissionError } = await client.rpc(
    "consume_password_recovery",
  );
  if (permissionError) redirect("/forgot-password?notice=expired");
  const { error } = await client.auth.updateUser({ password });
  if (error) {
    console.warn("Password update failed", {
      code: error.code,
      status: error.status,
    });
    await client.auth.signOut({ scope: "local" });
    redirect("/forgot-password?notice=failed");
  }
  const { error: signoutError } = await client.auth.signOut({
    scope: "global",
  });
  if (signoutError)
    console.warn("Recovery global sign-out failed", {
      code: signoutError.code,
      status: signoutError.status,
    });
  redirect(
    `/login?message=${encodeURIComponent(signoutError ? "Password updated. Sign in again. We couldn’t confirm that other devices were signed out." : "Password updated. Sign in with your new password.")}`,
  );
}
