"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/booking-validation";

export async function bookAppointment(form: FormData) {
  const service = String(form.get("service_id") ?? "");
  if (!uuid.test(service)) redirect("/account?notice=invalid");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/book/${service}`)}`);
  const [staff, start] = String(form.get("slot") ?? "").split("|");
  const request = String(form.get("request_id") ?? "");
  const price = Number(form.get("price_minor"));
  const duration = Number(form.get("duration_minutes"));
  if (
    !uuid.test(staff ?? "") ||
    !uuid.test(request) ||
    !start ||
    !Number.isFinite(Date.parse(start)) ||
    !Number.isInteger(price) ||
    !Number.isInteger(duration)
  )
    redirect(`/book/${service}?notice=invalid`);
  const { error } = await supabase.rpc("book_appointment", {
    p_service_id: service,
    p_staff_id: staff,
    p_starts_at: start,
    p_request_id: request,
    p_expected_price: price,
    p_expected_duration: duration,
  });
  if (error) {
    const notice = error.message.includes("service_changed")
      ? "changed"
      : error.message.includes("booking_limit")
        ? "limit"
        : "unavailable";
    redirect(`/book/${service}?notice=${notice}`);
  }
  revalidatePath("/account");
  revalidatePath("/business");
  redirect("/account?notice=booked");
}
export async function cancelAppointment(form: FormData) {
  const id = String(form.get("appointment_id") ?? "");
  const business = form.get("return_to") === "business";
  const target = business ? "/business" : "/account";
  if (!uuid.test(id)) redirect(`${target}?notice=invalid`);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(target)}`);
  const { error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: id,
  });
  if (error) redirect(`${target}?notice=cancel_failed`);
  revalidatePath("/account");
  revalidatePath("/business");
  redirect(`${target}?notice=cancelled`);
}
