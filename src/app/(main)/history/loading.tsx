import { Skeleton } from '@/components/ui/skeleton';

export default function HistoryLoading() {
  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <Skeleton className="h-6 w-12 mb-5" />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-muted)] mb-4">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
      </div>

      {/* Match items */}
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] border-l-4 bg-[var(--color-card)]"
            style={{ borderLeftColor: 'var(--color-border)' }}
          >
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-9 rounded-md" />
              </div>
              <Skeleton className="h-2.5 w-20" />
            </div>
            <div className="space-y-1.5 items-end flex flex-col">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-2.5 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
