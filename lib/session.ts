import "server-only";
import { cache } from "react";
import { getProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

/** The signed-in viewer for shared chrome (header, nav), or null for guests. Deduplicated per request. */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const [profile, { count }] = await Promise.all([
    getProfile(supabase, data.user.id),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", data.user.id).is("read_at", null),
  ]);
  return { user: data.user, profile, unread: count ?? 0 };
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;
