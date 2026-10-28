import { createHash } from "node:crypto";
import documents from "../content/legal-documents.json" with { type: "json" };
import operator from "../content/legal-operator.json" with { type: "json" };

export type LegalLocale = "ka" | "en";
export type LegalKind = "terms" | "privacy" | "provider_terms";
export const legalDocuments = documents;
export const legalOperator = operator;
export const legalLocale = (value: unknown): LegalLocale =>
  value === "en" ? "en" : "ka";
export function legalReadiness() {
  const missing: string[] = [];
  for (const key of [
    "legalName",
    "address",
    "contactEmail",
    "processingBasis",
    "retention",
    "transfers",
  ] as const) {
    if (
      !operator[key].trim() ||
      /\{\{|\[.*\]|example\.(com|invalid)|TODO/i.test(operator[key])
    )
      missing.push(key);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operator.contactEmail))
    missing.push("valid contact email");
  if (!operator.reviewedAt) missing.push("operator review");
  for (const doc of documents)
    if (doc.status !== "published" || doc.version.includes("draft"))
      missing.push(`${doc.kind} final version`);
  return missing;
}
export function documentHash(doc: (typeof documents)[number]) {
  return createHash("sha256")
    .update(JSON.stringify({ document: doc, operator }))
    .digest("hex");
}
export function displayedPolicyMatches(
  form: FormData,
  doc: (typeof documents)[number],
) {
  return (
    form.get(`version_${doc.kind}`) === doc.version &&
    form.get(`hash_${doc.kind}`) === documentHash(doc)
  );
}
export function legalText(
  text: string,
  locale: LegalLocale,
  snapshotOperator: Record<string, string | null> = operator,
) {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = snapshotOperator[key];
    return typeof value === "string" && value
      ? value
      : locale === "ka"
        ? "[ჯერ არ არის მითითებული]"
        : "[not yet supplied]";
  });
}
