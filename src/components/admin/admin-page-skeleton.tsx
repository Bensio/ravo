export function AdminPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-white/[0.06]" />
        <div className="h-4 w-72 max-w-full rounded-md bg-white/[0.04]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="ravo-glass-panel h-24 p-5" />
        ))}
      </div>
      <div className="ravo-glass-panel h-40 p-6" />
      <div className="ravo-glass-panel space-y-3 p-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}
