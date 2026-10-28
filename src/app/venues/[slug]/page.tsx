import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenue } from "@/lib/catalog";
import { StudioArt } from "@/components/studio-art";
import { ProviderDisclosure } from "@/components/provider-disclosure";
export const dynamic = "force-dynamic";
export default async function VenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getVenue(slug);
  if (!result) notFound();
  const { venue, services, provider, failed } = result;
  return (
    <main className="page-shell">
      <Link className="back" href="/#discover">
        ← All studios
      </Link>
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {venue.category} · {venue.neighborhood}, {venue.city}
          </span>
          <h1>{venue.name}</h1>
          <p>
            {venue.is_demo
              ? "Fictional preview studio · Bookings are not available"
              : "Discover your next ritual"}
          </p>
        </div>
        <span className="detail-spark" aria-hidden="true">
          ✳
        </span>
      </div>
      <StudioArt category={venue.category} large />
      <div className="detail-grid">
        <section>
          <span className="eyebrow">A SPACE FOR YOU</span>
          <h2>Meet your next good feeling.</h2>
          <p className="description">{venue.description}</p>
          {!venue.is_demo && (
            <ProviderDisclosure
              provider={provider}
              location={venue.service_address ?? ""}
            />
          )}
          <h2>Treatments</h2>
          {failed ? (
            <p role="alert">
              Treatments couldn’t be loaded. Please refresh to try again.
            </p>
          ) : services.length ? (
            <ul className="service-list">
              {services.map((s) => (
                <li key={s.id}>
                  <div>
                    <h3>{s.name}</h3>
                    <p>{s.duration_minutes} minutes</p>
                  </div>
                  <strong>
                    {new Intl.NumberFormat("en-GB", {
                      style: "currency",
                      currency: s.currency,
                    }).format(s.price_minor / 100)}
                  </strong>
                  {!venue.is_demo && (
                    <Link className="button secondary" href={`/book/${s.id}`}>
                      Choose time
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {venue.is_demo
                ? "This studio is part of our design preview. Real services will appear as businesses join."
                : "This studio hasn’t published treatments yet."}
            </p>
          )}
        </section>
        <aside className="detail-aside">
          <h3>Make time for yourself.</h3>
          <p>
            {venue.is_demo
              ? "You’re exploring a preview. Create an account to have your personal space ready."
              : "Choose a treatment to find an available time. Confirm your appointment online and pay at the studio."}
          </p>
          {venue.is_demo && (
            <Link className="button" href="/login?mode=signup">
              Create your account ↗
            </Link>
          )}
          <span>
            {venue.is_demo
              ? "No appointment will be created."
              : "All appointment times use Tbilisi (UTC+4)."}
          </span>
        </aside>
      </div>
    </main>
  );
}
