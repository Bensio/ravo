export function OverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-32 rounded-md bg-white/[0.06]" />
          <div className="h-3 w-48 rounded-md bg-white/[0.04]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-[8.5rem] rounded-lg bg-white/[0.04]" />
          <div className="h-9 w-9 rounded-lg bg-white/[0.04]" />
        </div>
      </div>
      <section className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="ravo-glass-panel h-[5.5rem]" />
        ))}
      </section>
      <section className="grid auto-rows-fr gap-3 lg:grid-cols-2">
        <div className="ravo-glass-panel h-64" />
        <div className="ravo-glass-panel h-64" />
      </section>
    </div>
  );
}
