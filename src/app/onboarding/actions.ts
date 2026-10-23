"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { providerDetails } from "@/lib/provider-validation";
export type ApplicationFormState = {
  error: string;
  values: Record<string, string> | null;
  categories: string[] | null;
};
export async function submitApplication(
  _previous: ApplicationFormState,
  form: FormData,
): Promise<ApplicationFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fonboarding");
  const details = providerDetails(form);
  const fail = (error: string): ApplicationFormState => ({
    error,
    values: Object.fromEntries(
      [
        "public_name",
        "contact_name",
        "phone",
        "city",
        "address_or_area",
        "work_mode",
        "experience_years",
        "description",
        "portfolio_url",
        "registration_number",
        "legal_name",
        "contact_address",
        "operating_status",
        "qualification_summary",
      ].map((key) => [key, String(form.get(key) ?? "").slice(0, 3000)]),
    ),
    categories: form
      .getAll("service_categories")
      .slice(0, 5)
      .map((value) => String(value).slice(0, 30)),
  });
  if (!details)
    return fail(
      "Check your contact and provider identity details, select at least one service, and confirm the declaration. Your entered details have been kept.",
    );
  const { error } = await supabase.rpc("submit_provider_application", {
    p_details: details,
  });
  if (
    error &&
    !error.message.includes("application_pending") &&
    !error.message.includes("already_approved") &&
    !error.message.includes("existing_provider")
  )
    return fail(
      "We couldn’t submit your application. Your details have been kept; please try again.",
    );
  if (error)
    redirect(
      `/onboarding?notice=${error.message.includes("application_pending") ? "pending" : error.message.includes("already_approved") || error.message.includes("existing_provider") ? "approved" : "failed"}`,
    );
  revalidatePath("/onboarding");
  revalidatePath("/account");
  revalidatePath("/business");
  redirect("/onboarding?notice=submitted");
}
