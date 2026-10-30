import { agreementDestination } from "@/lib/legal-server";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth-validation";
import { registrationDestination } from "@/lib/provider-validation";
import { hasSupabase } from "@/lib/supabase/env";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const recoveryRequested =
    request.nextUrl.searchParams.get("flow") === "recovery";
  if (code && hasSupabase()) {
    const supabase = await createClient();
    const flowId = request.nextUrl.searchParams.get("sb_flow_id");
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId === null ? undefined : { flowId },
    );
    if (!error) {
      const { data: eligible, error: recoveryError } = await supabase.rpc(
        "password_recovery_status",
      );
      if (recoveryRequested || (!recoveryError && eligible)) {
        return NextResponse.redirect(
          new URL(
            !recoveryError && eligible
              ? "/reset-password"
              : "/forgot-password?notice=expired",
            request.url,
          ),
        );
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const destination = registrationDestination(
        user?.user_metadata?.registration_kind,
        safeNext(request.nextUrl.searchParams.get("next")),
      );
      const target = user
        ? await agreementDestination(
            supabase,
            user.id,
            destination,
            user.user_metadata?.registration_kind === "business" ||
              user.user_metadata?.registration_kind === "professional",
          )
        : destination;
      return NextResponse.redirect(new URL(target, request.url));
    }
  }
  if (recoveryRequested)
    return NextResponse.redirect(
      new URL("/forgot-password?notice=expired", request.url),
    );
  return NextResponse.redirect(
    new URL(
      "/login?message=This%20confirmation%20link%20could%20not%20be%20verified.",
      request.url,
    ),
  );
}
