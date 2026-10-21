import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "You're offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-24">
      <p className="eyebrow">Offline</p>
      <h1 className="display-lg mt-3">No connection right now.</h1>
      <p className="mt-4 text-lg leading-relaxed text-body">
        Your data is safe. Reconnect to see your dashboard and check in. Take a slow breath in the meantime.
      </p>
      <Link href="/help" className="btn btn-primary mt-10 self-start">View help and crisis lines</Link>
    </main>
  );
}
