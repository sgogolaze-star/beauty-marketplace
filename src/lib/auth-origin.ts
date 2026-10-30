import "server-only";
import { headers } from "next/headers";
import { trustedAuthOrigin } from "@/lib/auth-validation";
export async function authOrigin() {
  const incoming = await headers();
  const origin = trustedAuthOrigin(
    incoming.get("origin") ??
      `${incoming.get("x-forwarded-proto") ?? "http"}://${incoming.get("host")}`,
    {
      configured: process.env.APP_ORIGIN,
      deployment: process.env.VERCEL_URL,
      branch: process.env.VERCEL_BRANCH_URL,
      allowLocal: !process.env.VERCEL,
    },
  );
  if (!origin) throw new Error("Auth callback origin is not configured");
  return origin;
}
