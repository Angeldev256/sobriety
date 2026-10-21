import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseOrigin } from "@/lib/env";

const PROTECTED = ["/dashboard", "/check-in", "/goals", "/milestones", "/history", "/settings", "/relapse", "/notifications", "/support"];
// Pages a signed-in member doesn't need: send them straight into their app.
const GUEST_ONLY = ["/", "/login", "/register", "/forgot-password"];

function redirectTo(request: NextRequest, pathname: string, search = "") {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

/**
 * Refreshes the Supabase session cookie on every request and routes people to the right
 * place. This is an optimistic check only — every page and action also verifies the user
 * server-side, and RLS enforces ownership in the database.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  let response = NextResponse.next({ request });
  let signedIn = false;

  if (isSupabaseConfigured()) {
    const supabase = createServerClient(supabaseOrigin(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    try {
      // Do not put code between createServerClient and getClaims(); it refreshes the token.
      const { data } = await supabase.auth.getClaims();
      signedIn = Boolean(data?.claims);
    } catch {
      signedIn = false; // network hiccup: treat as signed out rather than failing the request
    }
  }

  if (!signedIn && isProtected) {
    return redirectTo(request, "/login", `?next=${encodeURIComponent(pathname + search)}`);
  }

  // Keep a guest-only page reachable when explicitly asked for, e.g. /?home=1 from the footer.
  if (signedIn && GUEST_ONLY.includes(pathname) && !request.nextUrl.searchParams.has("home")) {
    return redirectTo(request, "/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static files, images, the service worker, manifest and icons
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
