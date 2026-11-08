import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hands out a short-lived link to a resource file. Storage policies decide who may read it:
// published files for any signed-in member, plus the uploader's own and everything for admins.
export async function GET(request: NextRequest, { params }: RouteContext<"/resources/[id]/download">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login?next=/resources", request.url));
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });

  const { data: resource } = await supabase.from("resources").select("file_path, file_name").eq("id", id).maybeSingle();
  if (!resource?.file_path) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await supabase.storage
    .from("resources")
    .createSignedUrl(resource.file_path, 60, { download: resource.file_name ?? true });
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
