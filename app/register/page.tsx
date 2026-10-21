import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/safe-redirect";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? `&next=${encodeURIComponent(safeNextPath(params.next))}` : "";
  redirect(`/login?mode=signup${next}`);
}
