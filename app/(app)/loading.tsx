export default function Loading() {
  return (
    <div className="space-y-12" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-3">
        <div className="skeleton h-3 w-40" />
        <div className="skeleton h-10 w-80 max-w-full" />
      </div>
      <div className="skeleton h-80" />
      <div className="skeleton h-24" />
    </div>
  );
}
