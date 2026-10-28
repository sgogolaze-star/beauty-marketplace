import { agreementDestination } from "@/lib/legal-server";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth-validation";
import { registrationDestination } from "@/lib/provider-validation";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
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
  return NextResponse.redirect(
    new URL(
      "/login?message=This%20confirmation%20link%20could%20not%20be%20verified.",
      request.url,
    ),
  );
}
