import { Skeleton } from '@/components/ui/skeleton';

export default function RankingLoading() {
  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="mb-5 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-28" />
      </div>

      <div className="space-y-2">
        {/* Top 3 */}
        {([['h-11 w-11', 'h-5 w-20'], ['h-9 w-9', 'h-4 w-16'], ['h-9 w-9', 'h-4 w-14']] as const).map(([avatarCls, ratingCls], i) => (
          <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-elevated)]">
            <div className="flex items-center gap-3">
              <Skeleton className="w-7 h-5 rounded" />
              <Skeleton className={`rounded-full ${avatarCls}`} />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className={`rounded-lg ${ratingCls}`} />
            </div>
          </div>
        ))}

        {/* 4位以下 */}
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
            <Skeleton className="w-6 h-4 rounded" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-14 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
