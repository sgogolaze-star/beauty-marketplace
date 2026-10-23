import Link from "next/link";
import { authenticate } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth-validation";
import { SubmitButton } from "@/components/submit-button";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const signup = params.mode === "signup";
  const next = safeNext(params.next);
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
            ? "Create an account to keep your beauty plans in one place."
            : "Sign in to your personal space."}
        </p>
        {params.message && (
          <p className="notice" role="status">
            {params.message.slice(0, 300)}
          </p>
        )}
        <form action={authenticate} className="stack">
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
          <SubmitButton>{signup ? "Create account" : "Sign in"}</SubmitButton>
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
