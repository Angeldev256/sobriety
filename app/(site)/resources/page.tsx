import type { Metadata } from "next";
import Link from "next/link";
import { ResourceUploadForm } from "@/components/care/resource-upload-form";
import { categoryLabel, RESOURCE_CATEGORIES } from "@/lib/care/constants";
import type { Resource } from "@/lib/database.types";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Resources",
  description: "Guides and fact sheets on addiction and recovery from Butabika National Referral Mental Hospital and other trusted institutions.",
};

const size = (bytes: number | null) => (bytes ? (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`) : "");

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  const params = await searchParams;
  const category = RESOURCE_CATEGORIES.find((c) => c.value === params.category)?.value ?? null;
  const viewer = await getViewer();
  const supabase = await createClient();

  let query = supabase.from("resources").select("*").eq("status", "published").order("published_at", { ascending: false }).limit(200);
  if (category) query = query.eq("category", category);
  const [{ data }, isAdminRes, proRes] = await Promise.all([
    query,
    viewer ? supabase.rpc("is_admin") : Promise.resolve({ data: false }),
    viewer ? supabase.from("professionals").select("status").eq("user_id", viewer.user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const resources = (data ?? []) as Resource[];
  const isAdmin = Boolean(isAdminRes.data);
  const canUpload = isAdmin || proRes.data?.status === "verified";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-14 px-5 pt-8 pb-24 sm:px-6 md:pt-14">
      <header className="max-w-2xl">
        <p className="eyebrow">Resources</p>
        <h1 className="display-lg mt-3">Trusted information, in one place.</h1>
        <p className="mt-4 text-lg leading-relaxed text-body">
          Guides, fact sheets and service information from Butabika National Referral Mental Hospital, the Ministry of Health and other
          trusted institutions. Each one names its source.
        </p>
      </header>

      <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
        <Link href="/resources" className={`chip ${!category ? "chip-on" : ""}`}>All</Link>
        {RESOURCE_CATEGORIES.map((c) => (
          <Link key={c.value} href={`/resources?category=${c.value}`} className={`chip ${category === c.value ? "chip-on" : ""}`}>{c.label}</Link>
        ))}
      </nav>

      <div className={`grid gap-16 ${canUpload ? "lg:grid-cols-[1fr_22rem] lg:gap-20" : ""}`}>
        <section aria-label="Library">
          {resources.length === 0 ? (
            <p className="caption">No resources here yet. Please check back soon.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {resources.map((r) => (
                <li key={r.id} className="space-y-2 py-6">
                  <p className="eyebrow">{r.institution} · {categoryLabel(r.category)}</p>
                  <h2 className="text-xl font-light">{r.title}</h2>
                  {r.description && <p className="max-w-2xl text-sm leading-relaxed text-body">{r.description}</p>}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm">
                    {r.file_path &&
                      (viewer ? (
                        <a href={`/resources/${r.id}/download`} className="link font-semibold">
                          Download{r.file_name ? ` ${r.file_name.split(".").pop()?.toUpperCase()}` : ""} {size(r.file_size) && `(${size(r.file_size)})`}
                        </a>
                      ) : (
                        <Link href={`/login?next=/resources`} className="link font-semibold">Sign in to download</Link>
                      ))}
                    {r.source_url && (
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="link">View on the original website ↗</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="caption mt-8">
            These resources are for information only and don&apos;t replace advice from a health professional.{" "}
            <Link href="/care" className="link">Talk to a professional</Link>.
          </p>
        </section>

        {canUpload && viewer && (
          <aside className="space-y-4">
            <h2 className="heading-lg">Add a resource</h2>
            <p className="caption">
              {isAdmin ? "As an admin, your uploads are published straight away." : "Your upload will be reviewed by an admin before it appears."}
            </p>
            <ResourceUploadForm userId={viewer.user.id} isAdmin={isAdmin} />
          </aside>
        )}
      </div>
    </main>
  );
}
