"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth-validation";
import { documentHash, displayedPolicyMatches, legalLocale } from "@/lib/legal";
import { currentAgreements } from "@/lib/legal-server";
export async function recordAgreements(form: FormData) {
  const suppliedNext = safeNext(String(form.get("next") ?? ""));
  const next = suppliedNext.startsWith("/legal/") ? "/account" : suppliedNext;
  const provider =
    form.get("provider") === "1" ||
    next.startsWith("/onboarding") ||
    next.startsWith("/business");
  const locale = legalLocale(form.get("locale"));
  const self = `/legal/accept?next=${encodeURIComponent(next)}&provider=${provider ? "1" : "0"}&lang=${locale}`;
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(self)}`);
  const docs = await currentAgreements(client, provider);
  if (!docs.length) redirect(`${self}&notice=draft`);
  if (docs.some((doc) => !displayedPolicyMatches(form, doc)))
    redirect(`${self}&notice=changed`);
  if (docs.some((doc) => form.get(doc.kind) !== "on"))
    redirect(`${self}&notice=confirm`);
  const versions = Object.fromEntries(
    docs.map((doc) => [doc.kind, doc.version]),
  );
  const hashes = Object.fromEntries(
    docs.map((doc) => [doc.kind, documentHash(doc)]),
  );
  const { error } = await client.rpc("record_legal_receipts", {
    p_versions: versions,
    p_hashes: hashes,
    p_locale: locale,
    p_provider: provider,
  });
  if (error) redirect(`${self}&notice=changed`);
  redirect(next);
}
