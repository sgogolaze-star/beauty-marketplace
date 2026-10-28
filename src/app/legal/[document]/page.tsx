import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  legalDocuments,
  legalLocale,
  legalReadiness,
  legalText,
  legalOperator,
} from "@/lib/legal";

import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { archivedDocument } from "@/lib/legal-server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Legal information",
  robots: { index: false, follow: false },
};
export default async function LegalDocument({
  params,
  searchParams,
}: {
  params: Promise<{ document: string }>;
  searchParams: Promise<{ lang?: string; version?: string }>;
}) {
  const [{ document: slug }, query] = await Promise.all([params, searchParams]);
  let document = legalDocuments.find((doc) => doc.slug === slug);
  if (!document) notFound();
  let snapshotOperator: Record<string, string | null> = legalOperator;
  let archived = false;
  if (
    query.version &&
    !(query.version === document.version && document.status === "draft")
  ) {
    if (!hasSupabase() || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(query.version))
      notFound();
    const snapshot = await archivedDocument(
      await createClient(),
      document.kind,
      query.version,
    );
    if (!snapshot) notFound();
    document = snapshot.document;
    snapshotOperator = snapshot.operator;
    archived = true;
  }
  const locale = legalLocale(query.lang);
  const versionQuery = query.version
    ? `&version=${encodeURIComponent(query.version)}`
    : "";
  const draft =
    document.status !== "published" ||
    (!archived && legalReadiness().length > 0);
  return (
    <main className="page-shell legal-page" lang={locale}>
      <Link className="back" href="/">
        ← {locale === "ka" ? "მთავარ გვერდზე" : "Back to explore"}
      </Link>
      <nav className="legal-language" aria-label="Document language">
        <Link
          href={`/legal/${slug}?lang=ka${versionQuery}`}
          hrefLang="ka"
          lang="ka"
          aria-current={locale === "ka" ? "page" : undefined}
        >
          ქართული
        </Link>
        <Link
          href={`/legal/${slug}?lang=en${versionQuery}`}
          hrefLang="en"
          lang="en"
          aria-current={locale === "en" ? "page" : undefined}
        >
          English
        </Link>
      </nav>
      <span className="eyebrow">BLOOM · {document.version}</span>
      <h1>{document.titles[locale]}</h1>
      {draft && (
        <aside
          className="legal-draft"
          aria-label={locale === "ka" ? "პროექტის სტატუსი" : "Draft status"}
        >
          <strong>
            {locale === "ka"
              ? "პროექტი — ჯერ არ მოქმედებს"
              : "Draft — not yet in effect"}
          </strong>
          <p>
            {locale === "ka"
              ? "ოპერატორის მონაცემები და რამდენიმე წესი ჯერ დასაზუსტებელია. ეს გვერდი წინასწარი გაცნობისთვისაა; მის გახსნას ან რეგისტრაციას ამ პროექტზე თანხმობად არ ვაფიქსირებთ."
              : "Operator details and some policies still need to be finalized. This page is for review. Opening it or registering does not record agreement to this draft."}
          </p>
        </aside>
      )}
      <article>
        {document.sections.map((section, index) => (
          <section key={index}>
            <h2>
              {index + 1}. {section[locale].title}
            </h2>
            {section[locale].paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>
                {legalText(paragraph, locale, snapshotOperator)}
              </p>
            ))}
          </section>
        ))}
      </article>
      <p className="form-note">
        {locale === "ka"
          ? "განხილვისთვის მომზადებულია: 28 ოქტომბერი 2026."
          : "Prepared for review: 28 October 2026."}
      </p>
    </main>
  );
}
