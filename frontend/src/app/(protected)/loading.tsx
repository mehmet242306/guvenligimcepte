/** Shown while the active protected page segment loads (after layout). */
export default function ProtectedRouteLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-9 w-48 animate-pulse rounded-md bg-muted sm:h-10 sm:w-56" />
      <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-lg border border-border bg-muted/40" />
        <div className="h-32 animate-pulse rounded-lg border border-border bg-muted/40" />
      </div>
    </div>
  );
}
