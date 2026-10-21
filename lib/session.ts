import "server-only";
import { cache } from "react";
import { getProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

async function loadViewer() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const [profile, unreadRes, connRes] = await Promise.all([
    getProfile(supabase, data.user.id),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", data.user.id).is("read_at", null),
    supabase
      .from("support_connections")
      .select("id, member_id, member_name, helper_id, helper_name, relationship, phone, is_preferred")
      .eq("status", "active")
      .or(`member_id.eq.${data.user.id},helper_id.eq.${data.user.id}`),
  ]);
  return { user: data.user, profile, unread: unreadRes.count ?? 0, connections: connRes.data ?? [] };
}

/** The signed-in viewer for shared chrome (header, nav, calls), or null for guests. Deduplicated per request. */
export const getViewer = cache(async () => {
  try {
    return await loadViewer();
  } catch {
    // A database or network error must never take the public site down with it.
    return null;
  }
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;
