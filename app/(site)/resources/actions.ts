"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { fieldErrorsOf, resourceSchema, type ActionState } from "@/lib/validations";

export type ResourceInput = {
  title: string;
  description: string;
  institution: string;
  category: string;
  source_url: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  permission: boolean;
};

/** Records a resource after its file (if any) was uploaded from the browser to the 'resources' bucket. */
export async function createResource(input: ResourceInput): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = resourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  if (parsed.data.file_path && !parsed.data.file_path.startsWith(`${user.id}/`)) return { ok: false, message: "That upload doesn't belong to you." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  const { permission, ...values } = parsed.data;
  void permission; // required by the schema, not stored
  const { error } = await supabase.from("resources").insert({
    ...values,
    uploaded_by: user.id,
    // Admins publish straight away; everyone else's uploads wait for an admin.
    status: isAdmin ? "published" : "pending",
  });
  if (error) {
    return { ok: false, message: error.code === "42501" ? "Only verified professionals and admins can add resources." : "We couldn't save that resource. Please try again." };
  }
  revalidatePath("/resources");
  revalidatePath("/admin");
  return { ok: true, message: isAdmin ? "Published." : "Thank you. An admin will review it before it appears in the library." };
}

/** Admin moderation: publish, archive or delete a resource (and its file). */
export async function moderateResource(id: string, action: "publish" | "archive" | "delete") {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(id).success) return;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return;

  if (action === "delete") {
    const { data: r } = await supabase.from("resources").select("file_path").eq("id", id).maybeSingle();
    await supabase.from("resources").delete().eq("id", id);
    if (r?.file_path) await supabase.storage.from("resources").remove([r.file_path]);
  } else {
    await supabase.from("resources").update({ status: action === "publish" ? "published" : "archived" }).eq("id", id);
  }
  revalidatePath("/resources");
  revalidatePath("/admin");
}
