import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { safeNext } from "@/lib/auth-validation";
import { documentHash, legalLocale } from "@/lib/legal";
import { currentAgreements } from "@/lib/legal-server";
import { LegalLinks } from "@/components/legal-links";
import { SubmitButton } from "@/components/submit-button";
import { recordAgreements } from "./actions";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Review agreements",
  robots: { index: false, follow: false },
};
export default async function ReviewAgreements({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    provider?: string;
    lang?: string;
    notice?: string;
  }>;
}) {
  const query = await searchParams;
  const suppliedNext = safeNext(query.next);
  const next = suppliedNext.startsWith("/legal/") ? "/account" : suppliedNext;
  const provider =
    query.provider === "1" ||
    next.startsWith("/onboarding") ||
    next.startsWith("/business");
  const locale = legalLocale(query.lang);
  const self = `/legal/accept?next=${encodeURIComponent(next)}&provider=${provider ? "1" : "0"}&lang=${locale}`;
  if (!hasSupabase()) redirect(`/login?next=${encodeURIComponent(self)}`);
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(self)}`);
  const docs = await currentAgreements(client, provider);
  return (
    <main className="page-shell legal-page" lang={locale}>
      <h1>
        {locale === "ka" ? "გაეცანით დოკუმენტებს" : "Review the documents"}
      </h1>
      <nav className="legal-language" aria-label="Document language">
        <Link href={`${self.replace(/&lang=\w+$/, "")}&lang=ka`} lang="ka">
          ქართული
        </Link>
        <Link href={`${self.replace(/&lang=\w+$/, "")}&lang=en`} lang="en">
          English
        </Link>
      </nav>
      {!docs.length ? (
        <>
          <aside className="legal-draft">
            <strong>
              {locale === "ka"
                ? "დოკუმენტები ჯერ პროექტებია"
                : "The documents are still drafts"}
            </strong>
            <p>
              {locale === "ka"
                ? "შეგიძლიათ გაეცნოთ მათ. პროექტებზე თანხმობას არ ვითხოვთ და არ ვაფიქსირებთ."
                : "You can read them now. We do not request or record acceptance of drafts."}
            </p>
          </aside>
          <LegalLinks />
          <Link className="button" href={next}>
            {locale === "ka" ? "გაგრძელება" : "Continue"}
          </Link>
        </>
      ) : (
        <>
          <p>
            {locale === "ka"
              ? "გაეცანით მითითებულ ვერსიებს. კონფიდენციალურობის შეტყობინების გაცნობა მარკეტინგულ თანხმობას არ ნიშნავს."
              : "Review the linked versions. Acknowledging the Privacy notice does not subscribe you to marketing."}
          </p>
          {query.notice && (
            <p className="notice" role="alert">
              {locale === "ka"
                ? "გთხოვთ, გადაამოწმოთ მიმდინარე ვერსიები და მონიშნოთ თითოეული დოკუმენტი."
                : "Review the current versions and check each document before continuing."}
            </p>
          )}
          <form action={recordAgreements} className="stack">
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="provider" value={provider ? "1" : "0"} />
            <input type="hidden" name="locale" value={locale} />
            <div className="legal-acknowledgements">
              {docs.map((doc) => (
                <label key={doc.kind}>
                  <input
                    type="hidden"
                    name={`version_${doc.kind}`}
                    value={doc.version}
                  />
                  <input
                    type="hidden"
                    name={`hash_${doc.kind}`}
                    value={documentHash(doc)}
                  />
                  <input type="checkbox" name={doc.kind} required />
                  <span>
                    {doc.kind === "privacy"
                      ? locale === "ka"
                        ? "გავეცანი: "
                        : "I have read: "
                      : locale === "ka"
                        ? "ვეთანხმები: "
                        : "I agree to: "}
                    <Link
                      href={`/legal/${doc.slug}?lang=${locale}&version=${encodeURIComponent(doc.version)}`}
                      target="_blank"
                      rel="noopener"
                    >
                      {doc.titles[locale]} ({doc.version}) ↗
                    </Link>
                  </span>
                </label>
              ))}
            </div>
            <SubmitButton>
              {locale === "ka"
                ? "დადასტურება და გაგრძელება"
                : "Confirm and continue"}
            </SubmitButton>
          </form>
        </>
      )}
    </main>
  );
}
