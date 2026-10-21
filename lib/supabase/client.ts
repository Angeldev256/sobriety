import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { supabaseOrigin } from "@/lib/env";

export function createClient() {
  return createBrowserClient<Database>(
    supabaseOrigin(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
