export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-4xl">
      <div className="bg-line h-8 w-48 animate-pulse rounded-md" />
      <div className="bg-line mt-3 h-4 w-72 max-w-full animate-pulse rounded" />
      <span className="sr-only">Duke u ngarkuar…</span>
    </div>
  );
}
