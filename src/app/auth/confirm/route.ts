import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registrationDestination } from "@/lib/provider-validation";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (token_hash && type === "email") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: "email",
    });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return NextResponse.redirect(
        new URL(
          registrationDestination(user?.user_metadata?.registration_kind),
          request.url,
        ),
      );
    }
  }
  return NextResponse.redirect(
    new URL(
      "/login?message=This%20confirmation%20link%20has%20expired%20or%20is%20invalid.",
      request.url,
    ),
  );
}
