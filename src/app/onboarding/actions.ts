"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { providerDetails } from "@/lib/provider-validation";
export async function submitApplication(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fonboarding");
  const details = providerDetails(form);
  if (!details) redirect("/onboarding?notice=invalid");
  const { error } = await supabase.rpc("submit_provider_application", {
    p_details: details,
  });
  if (error)
    redirect(
      `/onboarding?notice=${error.message.includes("application_pending") ? "pending" : error.message.includes("already_approved") || error.message.includes("existing_provider") ? "approved" : "failed"}`,
    );
  revalidatePath("/onboarding");
  revalidatePath("/account");
  revalidatePath("/business");
  redirect("/onboarding?notice=submitted");
}
