import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/auth-validation";
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
            ? "Your next good feeling starts here."
            : "Sign in to your personal space."}
        </p>
        {params.message && (
          <p className="notice" role="status">
            {params.message.slice(0, 300)}
          </p>
        )}
        <AuthForm signup={signup} initialKind={kind} next={next} />
        <p className="switch">
          {signup ? "Already have an account?" : "New here?"}{" "}
          <Link
            href={`/login?mode=${signup ? "login" : "signup"}&next=${encodeURIComponent(next)}`}
          >
            {signup ? "Sign in" : "Sign up"} →
          </Link>
        </p>
      </section>
    </main>
  );
}
