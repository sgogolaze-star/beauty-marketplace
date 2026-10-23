import Link from "next/link";
import { categories, filterVenues, getCatalog } from "@/lib/catalog";
import { StudioArt } from "@/components/studio-art";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 100);
  const city = (params.city ?? "").trim().slice(0, 100);
  const category = categories.includes(
    params.category as (typeof categories)[number],
  )
    ? params.category!
    : "All treatments";
  const catalog = await getCatalog();
  const venues = filterVenues(catalog.venues, query, city, category);
  const filtered = Boolean(query || city || category !== "All treatments");
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-spark">✧</span> YOUR NEXT GOOD FEELING STARTS
            HERE
          </span>
          <h1>
            A little time.
            <br />A little <em>more you.</em>
          </h1>
          <p>
            Discover beauty and wellness spaces you’ll love.
            <br className="desktop" /> From everyday rituals to a well-deserved
            reset.
          </p>
          <a href="#discover" className="hero-link">
            Find your next moment <span>↓</span>
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
          <div className="hero-panel">
            <div className="sun" />
            <div className="hero-vase" />
            <div className="hero-stem stem-one" />
            <div className="hero-stem stem-two" />
            <div className="hero-stem stem-three" />
            <div className="hero-plinth" />
          </div>
          <span className="floating-note">
            <span>✦</span> Make room for yourself.
          </span>
          <span className="art-caption">THE ART OF FEELING GOOD</span>
        </div>
      </section>
      <section className="discovery" id="discover">
        <form className="search-bar" action="/#discover">
          <label>
            <span className="field-label">WHAT ARE YOU LOOKING FOR?</span>
            <span className="search-input">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                name="q"
                aria-label="Treatment or studio"
                placeholder="Treatment or studio"
                defaultValue={query}
                maxLength={100}
              />
            </span>
          </label>
          <label>
            <span className="field-label">SOMEWHERE NEAR YOU</span>
            <span className="search-input">
              <span aria-hidden="true">⌖</span>
              <input
                name="city"
                aria-label="City"
                placeholder="City, e.g. Tbilisi"
                defaultValue={city}
                maxLength={100}
              />
            </span>
          </label>
          <input type="hidden" name="category" value={category} />
          <button className="button">
            Find my moment <span aria-hidden="true">↗</span>
          </button>
        </form>
        <nav className="categories" aria-label="Treatment categories">
          {categories.map((c, i) => (
            <Link
              key={c}
              className={`category ${c === category ? "selected" : ""}`}
              aria-current={c === category ? "page" : undefined}
              href={`/?${new URLSearchParams({ q: query, city, category: c })}#discover`}
            >
              <span aria-hidden="true">
                {["✳", "✂", "◒", "✧", "≈", "⌁"][i]}
              </span>
              {c}
            </Link>
          ))}
        </nav>
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOD SPACES. GREAT PEOPLE.</span>
            <h2>
              {filtered
                ? "Find your kind of care."
                : "Somewhere you’ll feel like you."}
            </h2>
            <p>
              {catalog.preview
                ? "A first look at the experience. These fictional studios are for exploring."
                : "Explore independent beauty and wellness studios."}
            </p>
          </div>
          <span className="result-count">
            {venues.length} {catalog.preview ? "preview studios" : "studios"}
          </span>
        </div>
        {catalog.failed ? (
          <div className="empty" role="alert">
            <h3>Studios couldn’t be loaded.</h3>
            <p>Please refresh to try again.</p>
            <Link href="/" className="button secondary">
              Try again
            </Link>
          </div>
        ) : venues.length ? (
          <div className="venue-grid">
            {venues.map((v) => (
              <Link
                className="venue-card"
                key={v.id}
                href={`/venues/${v.slug}`}
              >
                <div className="card-image">
                  <StudioArt category={v.category} />
                  <span className="image-badge">
                    {v.is_demo ? "Preview studio" : v.category}
                  </span>
                  <span className="card-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <div className="venue-meta">
                  <h3>{v.name}</h3>
                  <span>{v.category}</span>
                </div>
                <p>
                  {v.neighborhood} · {v.city}
                </p>
                <span className="venue-tag">
                  {v.is_demo ? "Explore the space" : "View treatments"}{" "}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>A fresh start?</h3>
            <p>
              No studios match these filters. Try another treatment or city.
            </p>
            <Link className="button secondary" href="/#discover">
              Clear filters
            </Link>
          </div>
        )}
        <aside className="care-banner">
          <span className="banner-flower" aria-hidden="true">
            ✳
          </span>
          <div>
            <span className="eyebrow">YOUR RITUAL, YOUR WAY</span>
            <h2>Good care starts with a little discovery.</h2>
            <p>
              Explore a new treatment. Find a new favourite. Make yourself a
              priority.
            </p>
          </div>
          <Link href="/login?mode=signup" className="button secondary">
            Make yourself at home ↗
          </Link>
        </aside>
      </section>
    </main>
  );
}
