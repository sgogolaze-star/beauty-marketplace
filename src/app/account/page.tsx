import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { signOut } from "@/app/auth/actions";
export const dynamic = "force-dynamic";
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  if (!hasSupabase())
    redirect("/login?message=Account%20access%20is%20not%20configured%20yet.");
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Faccount");
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, starts_at, status, service_name")
    .eq("customer_id", user.id)
    .order("starts_at", { ascending: false });
  const params = await searchParams;
  return (
    <main className="page-shell">
      <span className="eyebrow">YOUR PERSONAL SPACE</span>
      <div className="section-heading">
        <div>
          <h1>A little more you.</h1>
          <p>Signed in as {user.email}</p>
        </div>
        <form action={signOut}>
          <button className="button secondary">Sign out</button>
        </form>
      </div>
      {params.message && (
        <p role="status" className="notice">
          {params.message}
        </p>
      )}
      <section className="empty">
        <span className="empty-icon">✧</span>
        <h2>Your appointments</h2>
        {error ? (
          <p role="alert">
            We couldn’t load your appointments. Please refresh to try again.
          </p>
        ) : appointments?.length ? (
          <ul className="appointment-list">
            {appointments.map((a) => (
              <li key={a.id}>
                <strong>{a.service_name}</strong>
                <span>
                  {new Date(a.starts_at).toLocaleString("en-GB", {
                    timeZone: "Asia/Tbilisi",
                  })}{" "}
                  (Tbilisi) · {a.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p>
              Your next moment of care starts here. Confirmed appointments will
              appear in this space.
            </p>
            <Link className="button" href="/">
              Explore studios ↗
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
