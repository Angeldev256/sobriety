import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-24">
      <p className="eyebrow">404</p>
      <h1 className="display-lg mt-3">We couldn&apos;t find that page.</h1>
      <p className="mt-4 text-lg text-body">It may have moved, or the link might be out of date.</p>
      <Link href="/dashboard" className="btn btn-primary mt-10 self-start">Go to your dashboard</Link>
    </main>
  );
}
