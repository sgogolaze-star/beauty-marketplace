import fs from "node:fs";
const read = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
export function productionReadiness() {
  const operator = read("../src/content/legal-operator.json");
  const documents = read("../src/content/legal-documents.json");
  const missing = [
    "legalName",
    "address",
    "contactEmail",
    "processingBasis",
    "retention",
    "transfers",
  ].filter(
    (key) =>
      !operator[key]?.trim() ||
      /\{\{|\[.*\]|example\.(com|invalid)|TODO/i.test(operator[key]),
  );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operator.contactEmail))
    missing.push("valid contact email");
  if (!operator.reviewedAt) missing.push("operator review");
  for (const doc of documents)
    if (doc.status !== "published" || doc.version.includes("draft"))
      missing.push(`${doc.kind} final version`);
  return missing;
}
if (process.env.VERCEL_ENV === "production") {
  const missing = productionReadiness();
  if (missing.length) {
    console.error(
      `Production legal configuration is incomplete: ${missing.join(", ")}. Preview builds remain available.`,
    );
    process.exitCode = 1;
  }
}
