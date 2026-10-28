import { agreementDestination } from "@/lib/legal-server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  formatTime,
  money,
  tbilisiDate,
  uuid,
  validDay,
} from "@/lib/booking-validation";
import { bookAppointment } from "../actions";
import { SubmitButton } from "@/components/submit-button";
export const dynamic = "force-dynamic";
const notices: Record<string, string> = {
  invalid: "Choose an available time to continue.",
  unavailable: "That time is no longer available. Please choose another time.",
  changed:
    "This treatment changed. Review the updated price and duration before booking.",
  limit: "You have reached the limit of 10 upcoming appointments.",
};
export default async function Book({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ day?: string; notice?: string }>;
}) {
  const { serviceId } = await params;
  if (!uuid.test(serviceId)) notFound();
  const query = await searchParams;
  const day = validDay(query.day) ? query.day! : tbilisiDate();
  const next = `/book/${serviceId}?day=${day}`;
  if (!hasSupabase()) redirect(`/login?next=${encodeURIComponent(next)}`);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const legalNext = await agreementDestination(supabase, user.id, next, false);
  if (legalNext !== next) redirect(legalNext);
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id,name,venue_id,price_minor,currency,duration_minutes")
    .eq("id", serviceId)
    .eq("active", true)
    .maybeSingle();
  if (serviceError) throw new Error("Unable to load treatment");
  if (!service) notFound();
  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("name,slug,city,neighborhood,is_demo")
    .eq("id", service.venue_id)
    .eq("published", true)
    .maybeSingle();
  if (venueError) throw new Error("Unable to load studio");
  if (!venue || venue.is_demo) notFound();
  const { data: slots, error } = await supabase.rpc("list_booking_slots", {
    p_service_id: serviceId,
    p_day: day,
  });
  const maximum = tbilisiDate(new Date(new Date().getTime() + 90 * 86400000));
  return (
    <main className="page-shell">
      <Link className="back" href={`/venues/${venue.slug}`}>
        ← Back to {venue.name}
      </Link>
      <span className="eyebrow">YOUR NEXT MOMENT · CHOOSE A TIME</span>
      <h1>Make a little room.</h1>
      <div className="booking-layout">
        <section>
          <h2>When works for you?</h2>
          <p>
            All times are in Tbilisi (UTC+4). Book at least 30 minutes ahead.
          </p>
          <form className="date-picker" action={`/book/${serviceId}`}>
            <label>
              Appointment date
              <input
                type="date"
                required
                name="day"
                defaultValue={day}
                min={tbilisiDate()}
                max={maximum}
              />
            </label>
            <button className="button secondary">Show times</button>
          </form>
          {query.notice && notices[query.notice] && (
            <p role="status" className="notice">
              {notices[query.notice]}
            </p>
          )}
          {error ? (
            <p role="alert" className="notice">
              We couldn’t load availability. Please try again.
            </p>
          ) : !slots?.length ? (
            <div className="empty">
              <h3>A different day, perhaps?</h3>
              <p>No available times on this date. Try another day.</p>
            </div>
          ) : (
            <form action={bookAppointment} className="stack">
              <input type="hidden" name="service_id" value={serviceId} />
              <input type="hidden" name="request_id" value={randomUUID()} />
              <input
                type="hidden"
                name="price_minor"
                value={service.price_minor}
              />
              <input
                type="hidden"
                name="duration_minutes"
                value={service.duration_minutes}
              />
              <fieldset className="slot-fieldset">
                <legend>Choose your time and professional</legend>
                <div className="slot-grid">
                  {slots.map((slot) => (
                    <label
                      className="slot-option"
                      key={`${slot.staff_id}-${slot.starts_at}`}
                    >
                      <input
                        required
                        type="radio"
                        name="slot"
                        value={`${slot.staff_id}|${slot.starts_at}`}
                      />
                      <span>
                        <strong>{formatTime(slot.starts_at)}</strong>
                        <small>
                          {slot.staff_name} · until {formatTime(slot.ends_at)}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="booking-terms">
                Confirming reserves this appointment. Pay at the studio; no
                online payment is taken. You can cancel before the appointment
                begins.
              </p>
              <SubmitButton>
                Confirm appointment ·{" "}
                {money(service.price_minor, service.currency)}
              </SubmitButton>
            </form>
          )}
        </section>
        <aside className="detail-aside booking-summary">
          <span className="eyebrow">YOUR MOMENT OF CARE</span>
          <h2>{venue.name}</h2>
          <p>
            {venue.neighborhood} · {venue.city}
          </p>
          <hr />
          <h3>{service.name}</h3>
          <p>{service.duration_minutes} minutes</p>
          <div className="total-row">
            <span>Total · pay at studio</span>
            <strong>{money(service.price_minor, service.currency)}</strong>
          </div>
          <p>No charge online. Your time is reserved after confirmation.</p>
        </aside>
      </div>
    </main>
  );
}
