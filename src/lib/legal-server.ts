import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { documentHash, legalDocuments, legalReadiness } from "@/lib/legal";

export async function currentAgreements(
  client: SupabaseClient<Database>,
  provider: boolean,
) {
  if (legalReadiness().length) return [];
  const wanted = legalDocuments.filter(
    (doc) => provider || doc.kind !== "provider_terms",
  );
  const { data, error } = await client
    .from("legal_documents")
    .select("kind,version,content_sha256")
    .eq("status", "published");
  if (
    error ||
    wanted.some(
      (doc) =>
        !data?.some(
          (row) =>
            row.kind === doc.kind &&
            row.version === doc.version &&
            row.content_sha256 === documentHash(doc),
        ),
    )
  )
    throw new Error(
      "Published policy versions are not synchronized. Please try again later.",
    );
  return wanted;
}
export async function agreementDestination(
  client: SupabaseClient<Database>,
  userId: string,
  next: string,
  provider: boolean,
) {
  const docs = await currentAgreements(client, provider);
  if (!docs.length) return next;
  const { data, error } = await client
    .from("legal_receipts")
    .select("kind,version")
    .eq("user_id", userId);
  if (error) throw new Error("Unable to check policy records");
  return docs.every((doc) =>
    data?.some(
      (receipt) => receipt.kind === doc.kind && receipt.version === doc.version,
    ),
  )
    ? next
    : `/legal/accept?next=${encodeURIComponent(next)}&provider=${provider ? "1" : "0"}`;
}
export async function archivedDocument(
  client: SupabaseClient<Database>,
  kind: string,
  version: string,
) {
  const { data, error } = await client
    .from("legal_documents")
    .select("content_json,content_sha256")
    .eq("kind", kind)
    .eq("version", version)
    .in("status", ["published", "retired"])
    .maybeSingle();
  if (error) throw new Error("Unable to load this policy version");
  if (!data) return null;
  if (
    createHash("sha256").update(data.content_json).digest("hex") !==
    data.content_sha256
  )
    throw new Error("Policy snapshot verification failed");
  const snapshot = JSON.parse(data.content_json);
  const doc = snapshot?.document;
  if (
    doc?.kind !== kind ||
    doc?.version !== version ||
    doc.status !== "published" ||
    !Array.isArray(doc.sections) ||
    !doc.sections.length ||
    doc.sections.length > 30 ||
    !["en", "ka"].every(
      (locale) =>
        typeof doc.titles?.[locale] === "string" &&
        doc.sections.every(
          (
            section: Record<string, { title?: unknown; paragraphs?: unknown }>,
          ) =>
            typeof section?.[locale]?.title === "string" &&
            Array.isArray(section[locale].paragraphs) &&
            section[locale].paragraphs.every(
              (paragraph: unknown) => typeof paragraph === "string",
            ),
        ),
    )
  )
    throw new Error("Invalid policy snapshot");
  if (
    !snapshot.operator ||
    ![
      "brand",
      "legalName",
      "address",
      "contactEmail",
      "processingBasis",
      "retention",
      "transfers",
    ].every((key) => typeof snapshot.operator[key] === "string")
  )
    throw new Error("Invalid policy operator snapshot");
  return {
    document: doc as (typeof legalDocuments)[number],
    operator: snapshot.operator as Record<string, string | null>,
  };
}
