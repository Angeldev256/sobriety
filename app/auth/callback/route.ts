import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

/**
 * Lands here from Google sign-in, email confirmation and password-reset links.
 * Swaps the one-time code for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next === "/reset-password") return NextResponse.redirect(`${origin}/reset-password`);
      return NextResponse.redirect(`${origin}/auth/welcome?next=${encodeURIComponent(next)}`);
    }
    // Most common cause: the link was opened in a different browser, or it expired.
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
