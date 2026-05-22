export default function BadgesLoading() {
  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-8">
      <div className="h-7 w-20 rounded-lg bg-[var(--color-card-elevated)] animate-pulse" />
      <div className="rounded-xl h-16 bg-[var(--color-card-elevated)] animate-pulse" />
      {[0, 1, 2].map(i => (
        <div key={i} className="space-y-3">
          <div className="h-4 w-24 rounded bg-[var(--color-card-elevated)] animate-pulse" />
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map(j => (
              <div key={j} className="h-28 rounded-2xl bg-[var(--color-card-elevated)] animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
