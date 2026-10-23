import Link from "next/link";
import { authenticate } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth-validation";
import { SubmitButton } from "@/components/submit-button";
import { registrationType } from "@/lib/provider-validation";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const signup = params.mode === "signup";
  const next = safeNext(params.next);
  const kind = registrationType(params.as);
  return (
    <main className="auth-wrap">
      <div className="auth-art">
        <span className="eyebrow">A LITTLE TIME, JUST FOR YOU</span>
        <h1>
          Your next
          <br />
          <em>good feeling.</em>
        </h1>
        <p>Find your people. Make time for yourself.</p>
        <div className="orb" />
      </div>
      <section className="auth-card">
        <Link href="/" className="back">
          ← Back to explore
        </Link>
        <span className="eyebrow">WELCOME TO BLOOM</span>
        <h2>{signup ? "Make yourself at home." : "Good to see you again."}</h2>
        <p>
          {signup
            ? kind === "customer"
              ? "Create an account to discover and book services."
              : "Create your account and confirm your email. Next, tell us about your services and submit an application for review."
            : "Sign in to your personal space."}
        </p>
        {signup && (
          <nav className="registration-choices" aria-label="Account type">
            {[
              ["customer", "Customer", "Discover and book"],
              ["business", "Business", "Register your salon or studio"],
              [
                "professional",
                "Individual professional",
                "Offer services independently",
              ],
            ].map(([value, label, description]) => (
              <Link
                className={kind === value ? "selected" : ""}
                key={value}
                href={`/login?mode=signup&as=${value}&next=${encodeURIComponent(next)}`}
                aria-current={kind === value ? "page" : undefined}
              >
                <strong>{label}</strong>
                <small>{description}</small>
              </Link>
            ))}
          </nav>
        )}
        {params.message && (
          <p className="notice" role="status">
            {params.message.slice(0, 300)}
          </p>
        )}
        <form action={authenticate} className="stack">
          <input type="hidden" name="registration_kind" value={kind} />
          <input
            type="hidden"
            name="mode"
            value={signup ? "signup" : "login"}
          />
          <input type="hidden" name="next" value={next} />
          <label>
            Email address
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              name="password"
              minLength={8}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
              placeholder="At least 8 characters"
            />
          </label>
          <SubmitButton>
            {signup
              ? kind === "customer"
                ? "Create customer account"
                : "Create account and continue"
              : "Sign in"}
          </SubmitButton>
        </form>
        <p className="switch">
          {signup ? "Already have an account?" : "New here?"}{" "}
          <Link
            href={`/login?mode=${signup ? "login" : "signup"}&next=${encodeURIComponent(next)}`}
          >
            {signup ? "Sign in" : "Create an account"} →
          </Link>
        </p>
      </section>
    </main>
  );
}
