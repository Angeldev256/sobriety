"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-12" role="alert">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display-lg mt-3">We couldn&apos;t load this page.</h1>
      <p className="mt-4 text-lg text-body">It&apos;s not you, and your data is safe.</p>
      <div className="mt-10 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <a href="/help" className="btn btn-secondary">Get help</a>
      </div>
    </div>
  );
}
