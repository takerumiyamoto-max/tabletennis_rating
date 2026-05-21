import { Skeleton } from '@/components/ui/skeleton';

export default function HomeLoading() {
  return (
    <div className="px-4 pt-6 space-y-5 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-7 w-36" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>

      {/* RatingCard */}
      <div className="rounded-2xl border border-[var(--color-border)] p-5 space-y-4 bg-[var(--color-card-elevated)]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-14 w-32" />
          </div>
          <div className="space-y-2 items-end flex flex-col">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <Skeleton className="h-px w-full rounded-none" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-11 rounded-lg" />
        </div>
      </div>

      {/* RecentMatches */}
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-20 mb-1" />
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] border-l-4 bg-[var(--color-card)]"
            style={{ borderLeftColor: 'var(--color-border)' }}
          >
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <div className="space-y-1.5 items-end flex flex-col">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-2.5 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
