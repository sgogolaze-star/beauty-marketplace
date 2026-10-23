"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localTimestamp, priceMinor, uuid } from "@/lib/booking-validation";
import { categories } from "@/lib/catalog";

export async function manageBusiness(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fbusiness");
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const fail = (notice = "invalid"): never =>
    redirect(`/business?notice=${notice}`);
  const op = get("operation");
  const { data: businesses, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id);
  if (businessError || !businesses?.length) fail("access");
  const ids = businesses!.map((b) => b.id);
  if (op === "venue") {
    const business = get("business_id"),
      slug = get("slug"),
      name = get("name"),
      city = get("city"),
      category = get("category");
    if (
      !ids.includes(business) ||
      !name ||
      name.length > 150 ||
      !city ||
      city.length > 100 ||
      !categories.slice(1).includes(category as (typeof categories)[number]) ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
      slug.length > 100
    )
      fail();
    const { error } = await supabase.from("venues").insert({
      business_id: business,
      name,
      slug,
      city,
      category,
      neighborhood: get("neighborhood"),
      description: get("description"),
    });
    if (error) fail(error.code === "23505" ? "slug" : "invalid");
  } else {
    const venue = get("venue_id");
    if (!uuid.test(venue)) fail();
    const { data: owned } = await supabase
      .from("venues")
      .select("id")
      .eq("id", venue)
      .in("business_id", ids)
      .maybeSingle();
    if (!owned) fail("access");
    if (op === "service") {
      const price = priceMinor(get("price")),
        duration = Number(get("duration")),
        name = get("name");
      if (
        price === null ||
        !Number.isInteger(duration) ||
        duration < 5 ||
        duration > 480 ||
        !name ||
        name.length > 150
      )
        fail();
      const { error } = await supabase.from("services").insert({
        venue_id: venue,
        name,
        price_minor: price!,
        duration_minutes: duration,
        active: true,
      });
      if (error) fail();
    } else if (op === "staff") {
      const name = get("name");
      if (!name || name.length > 100) fail();
      const { error } = await supabase
        .from("staff")
        .insert({ venue_id: venue, display_name: name, active: true });
      if (error) fail();
    } else if (op === "assign") {
      const staff = get("staff_id"),
        service = get("service_id");
      if (!uuid.test(staff) || !uuid.test(service)) fail();
      const { error } = await supabase
        .from("staff_services")
        .insert({ venue_id: venue, staff_id: staff, service_id: service });
      if (error && error.code !== "23505") fail();
    } else if (op === "availability") {
      const start = localTimestamp(get("starts_at")),
        end = localTimestamp(get("ends_at")),
        staff = get("staff_id");
      if (
        !start ||
        !end ||
        !uuid.test(staff) ||
        Date.parse(start!) >= Date.parse(end!)
      )
        fail();
      const { error } = await supabase.from("availability").insert({
        venue_id: venue,
        staff_id: staff,
        starts_at: start!,
        ends_at: end!,
      });
      if (error) fail(error.code === "23P01" ? "overlap" : "invalid");
    } else if (op === "remove_availability") {
      const id = get("id");
      if (!uuid.test(id)) fail();
      const { error } = await supabase.rpc("remove_availability", { p_id: id });
      if (error)
        fail(
          error.message.includes("availability_has_bookings")
            ? "has_bookings"
            : "invalid",
        );
    } else if (op === "publish") {
      const { error } = await supabase
        .from("venues")
        .update({ published: get("enabled") === "true" })
        .eq("id", venue)
        .select("id")
        .single();
      if (error) fail();
    } else if (op === "service_active" || op === "staff_active") {
      const id = get("id");
      if (!uuid.test(id)) fail();
      const table = op === "service_active" ? "services" : "staff";
      const { error } = await supabase
        .from(table)
        .update({ active: get("enabled") === "true" })
        .eq("id", id)
        .eq("venue_id", venue)
        .select("id")
        .single();
      if (error) fail();
    } else fail();
  }
  revalidatePath("/");
  revalidatePath("/business");
  redirect("/business?notice=saved");
}
