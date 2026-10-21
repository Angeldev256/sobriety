import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

/** Supabase client bound to the signed-in user's cookies. All queries run under RLS as that user. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes the session instead.
        }
      },
    },
  });
}

/** The current user (verified with Supabase Auth) or a redirect to /login. Deduplicated per request. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
});

/**
 * Service-role client that BYPASSES RLS. Only for trusted server jobs (the reminder cron).
 * Never import this from code that handles a user request.
 */
export function createServiceClient() {
  if (!env.supabaseSecretKey) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createAdminClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
