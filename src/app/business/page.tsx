import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { categories } from "@/lib/catalog";
import { money } from "@/lib/booking-validation";
import { manageBusiness } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { CancelAppointment } from "@/components/cancel-appointment";
export const dynamic = "force-dynamic";
const notices: Record<string, string> = {
  saved: "Your changes are saved.",
  access: "This action requires an approved business you own.",
  invalid:
    "We couldn’t save that change. Check the fields, time range, and selected studio.",
  slug: "That studio URL is already taken. Choose another.",
  overlap:
    "That availability overlaps an existing window. Choose another time.",
  has_bookings:
    "This window has confirmed appointments. Cancel them before removing availability.",
  cancelled: "The appointment is cancelled.",
  cancel_failed:
    "We couldn’t cancel that appointment. It may have already started.",
};
function Fields({ operation, venue }: { operation: string; venue: string }) {
  return (
    <>
      <input type="hidden" name="operation" value={operation} />
      <input type="hidden" name="venue_id" value={venue} />
    </>
  );
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Asia/Tbilisi",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
export default async function Business({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  if (!hasSupabase()) redirect("/login?next=%2Fbusiness");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fbusiness");
  const query = await searchParams;
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("name");
  if (error) throw new Error("Unable to load businesses");
  if (!businesses?.length)
    return (
      <main className="page-shell">
        <span className="eyebrow">FOR BUSINESS</span>
        <h1>Your studio, thoughtfully run.</h1>
        <div className="empty">
          <h2>Business approval comes first.</h2>
          <p>
            Your account doesn’t have an approved business yet. An operator must
            verify the business and link ownership before you can publish
            studios or manage appointments.
          </p>
          <Link className="button secondary" href="/account">
            Back to my account
          </Link>
        </div>
      </main>
    );
  const { data: venues, error: venueError } = await supabase
    .from("venues")
    .select("id,name,slug,published,business_id")
    .in(
      "business_id",
      businesses.map((b) => b.id),
    )
    .order("name");
  if (venueError) throw new Error("Unable to load studios");
  const ids = venues?.map((v) => v.id) ?? [];
  const [
    serviceResult,
    staffResult,
    assignmentResult,
    availabilityResult,
    appointmentResult,
  ] = await Promise.all([
    supabase.from("services").select("*").in("venue_id", ids).order("name"),
    supabase
      .from("staff")
      .select("*")
      .in("venue_id", ids)
      .order("display_name"),
    supabase.from("staff_services").select("*").in("venue_id", ids),
    supabase
      .from("availability")
      .select("*")
      .in("venue_id", ids)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(200),
    supabase
      .from("appointments")
      .select("id,venue_id,service_name,starts_at,status,price_minor,currency")
      .in("venue_id", ids)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(100),
  ]);
  if (
    [
      serviceResult,
      staffResult,
      assignmentResult,
      availabilityResult,
      appointmentResult,
    ].some((r) => r.error)
  )
    throw new Error("Unable to load business schedule");
  return (
    <main className="page-shell">
      <span className="eyebrow">YOUR BUSINESS SPACE</span>
      <h1>A good day, in the making.</h1>
      <p>
        Manage treatments, professionals, and availability. All times use
        Tbilisi (UTC+4).
      </p>
      {query.notice && notices[query.notice] && (
        <p className="notice" role="status">
          {notices[query.notice]}
        </p>
      )}
      <details className="workspace-panel">
        <summary>Add a studio</summary>
        <form className="stack" action={manageBusiness}>
          <input type="hidden" name="operation" value="venue" />
          <label>
            Business
            <select name="business_id" required>
              {businesses.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Studio name
            <input name="name" required maxLength={150} />
          </label>
          <label>
            Studio URL slug
            <input
              name="slug"
              required
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="your-studio"
            />
          </label>
          <label>
            City
            <input
              name="city"
              required
              maxLength={100}
              defaultValue="Tbilisi"
            />
          </label>
          <label>
            Neighbourhood
            <input name="neighborhood" maxLength={100} />
          </label>
          <label>
            Category
            <select name="category">
              {categories.slice(1).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            About the studio
            <textarea name="description" maxLength={4000} />
          </label>
          <SubmitButton>Create draft studio</SubmitButton>
        </form>
      </details>
      {venues?.map((v) => {
        const services =
          serviceResult.data?.filter((s) => s.venue_id === v.id) ?? [];
        const staff =
          staffResult.data?.filter((s) => s.venue_id === v.id) ?? [];
        const windows =
          availabilityResult.data?.filter((a) => a.venue_id === v.id) ?? [];
        return (
          <section className="workspace-panel" key={v.id}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  {v.published ? "PUBLISHED" : "DRAFT STUDIO"}
                </span>
                <h2>{v.name}</h2>
                {v.published && (
                  <Link className="back" href={`/venues/${v.slug}`}>
                    View public studio ↗
                  </Link>
                )}
              </div>
              <form action={manageBusiness}>
                <Fields venue={v.id} operation="publish" />
                <input
                  type="hidden"
                  name="enabled"
                  value={String(!v.published)}
                />
                <button className="button secondary">
                  {v.published ? "Unpublish studio" : "Publish studio"}
                </button>
              </form>
            </div>
            <div className="workspace-grid">
              <div>
                <h3>Treatments</h3>
                <ul className="workspace-list">
                  {services.map((s) => (
                    <li key={s.id}>
                      <div>
                        <strong>{s.name}</strong>
                        <p>
                          {s.duration_minutes} min · {money(s.price_minor)} ·{" "}
                          {s.active ? "Active" : "Hidden"}
                        </p>
                      </div>
                      <form action={manageBusiness}>
                        <Fields venue={v.id} operation="service_active" />
                        <input type="hidden" name="id" value={s.id} />
                        <input
                          type="hidden"
                          name="enabled"
                          value={String(!s.active)}
                        />
                        <button className="text-button">
                          {s.active ? "Hide" : "Activate"}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
                <details>
                  <summary>Add treatment</summary>
                  <form action={manageBusiness} className="stack">
                    <Fields venue={v.id} operation="service" />
                    <label>
                      Treatment name
                      <input name="name" required maxLength={150} />
                    </label>
                    <label>
                      Duration (minutes)
                      <input
                        name="duration"
                        required
                        type="number"
                        min={5}
                        max={480}
                        defaultValue={30}
                      />
                    </label>
                    <label>
                      Price (GEL)
                      <input
                        name="price"
                        required
                        type="number"
                        min={0}
                        max={1000000}
                        step="0.01"
                      />
                    </label>
                    <SubmitButton>Add treatment</SubmitButton>
                  </form>
                </details>
              </div>
              <div>
                <h3>Professionals</h3>
                <ul className="workspace-list">
                  {staff.map((s) => (
                    <li key={s.id}>
                      <div>
                        <strong>{s.display_name}</strong>
                        <p>{s.active ? "Active" : "Hidden"}</p>
                      </div>
                      <form action={manageBusiness}>
                        <Fields venue={v.id} operation="staff_active" />
                        <input type="hidden" name="id" value={s.id} />
                        <input
                          type="hidden"
                          name="enabled"
                          value={String(!s.active)}
                        />
                        <button className="text-button">
                          {s.active ? "Hide" : "Activate"}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
                <details>
                  <summary>Add professional</summary>
                  <form action={manageBusiness} className="stack">
                    <Fields venue={v.id} operation="staff" />
                    <label>
                      Professional name
                      <input name="name" required maxLength={100} />
                    </label>
                    <SubmitButton>Add professional</SubmitButton>
                  </form>
                </details>
              </div>
            </div>
            <h3>Who offers which treatment?</h3>
            <ul className="workspace-list">
              {assignmentResult.data
                ?.filter((a) => a.venue_id === v.id)
                .map((a) => (
                  <li key={`${a.staff_id}-${a.service_id}`}>
                    {staff.find((s) => s.id === a.staff_id)?.display_name} ·{" "}
                    {services.find((s) => s.id === a.service_id)?.name}
                  </li>
                ))}
            </ul>
            {staff.length > 0 && services.length > 0 && (
              <form action={manageBusiness} className="inline-form">
                <Fields venue={v.id} operation="assign" />
                <label>
                  Professional
                  <select name="staff_id">
                    {staff.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Treatment
                  <select name="service_id">
                    {services.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <SubmitButton>Assign treatment</SubmitButton>
              </form>
            )}
            <h3>Availability</h3>
            <p className="muted-small">
              Add dated windows up to 90 days ahead (maximum 16 hours each).
              Slots start every 15 minutes from the window’s opening time.
              Showing the next 200 windows.
            </p>
            {staff.length > 0 && (
              <form action={manageBusiness} className="inline-form">
                <Fields venue={v.id} operation="availability" />
                <label>
                  Professional
                  <select name="staff_id">
                    {staff.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Starts (Tbilisi)
                  <input type="datetime-local" name="starts_at" required />
                </label>
                <label>
                  Ends (Tbilisi)
                  <input type="datetime-local" name="ends_at" required />
                </label>
                <SubmitButton>Add availability</SubmitButton>
              </form>
            )}
            <ul className="workspace-list">
              {windows.map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>
                      {staff.find((s) => s.id === a.staff_id)?.display_name}
                    </strong>
                    <p>
                      {dateLabel(a.starts_at)} → {dateLabel(a.ends_at)}
                    </p>
                  </div>
                  <form action={manageBusiness}>
                    <Fields venue={v.id} operation="remove_availability" />
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-button">Remove window</button>
                  </form>
                </li>
              ))}
            </ul>
            <h3>Upcoming appointments</h3>
            <ul className="workspace-list">
              {appointmentResult.data
                ?.filter((a) => a.venue_id === v.id)
                .map((a) => (
                  <li key={a.id}>
                    <div>
                      <strong>{a.service_name}</strong>
                      <p>
                        {dateLabel(a.starts_at)} ·{" "}
                        {money(a.price_minor, a.currency)} · {a.status}
                      </p>
                      {a.status === "confirmed" && (
                        <CancelAppointment id={a.id} business />
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
