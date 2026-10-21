import { NextResponse, type NextRequest } from "next/server";
import { emailTemplates } from "@/lib/notifications/email";
import { notify } from "@/lib/notifications/notify";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Runs once after a new account's first sign-in (email confirmation or Google): sends the
 * welcome email and inbox note, then continues to where the user was going.
 */
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/login", request.url));

  // Claim the flag first so a double redirect can't send two welcomes.
  const { data: claimed } = await supabase
    .from("profiles")
    .update({ welcome_email_sent: true })
    .eq("id", data.user.id)
    .eq("welcome_email_sent", false)
    .select("display_name")
    .maybeSingle();

  if (claimed) {
    const name = claimed.display_name?.split(" ")[0] ?? "there";
    await notify(supabase, data.user.id, {
      kind: "welcome",
      title: "Welcome to Sobriety Tracker",
      body: "Your private space is ready. Start by adding what you're working on — and remember, the toolkit and help lines are always here.",
      url: "/dashboard",
      email: data.user.email ? { to: data.user.email, content: emailTemplates.welcome(name) } : null,
    });
  }

  return NextResponse.redirect(new URL(next, request.url));
}
