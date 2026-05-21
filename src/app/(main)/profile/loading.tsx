import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      {/* Profile hero */}
      <div className="rounded-2xl overflow-hidden border border-[var(--color-border)]">
        <Skeleton className="h-24 w-full rounded-none" />
        <div className="px-5 pb-5 bg-[var(--color-card)]">
          <div className="-mt-10 flex items-end justify-between mb-4">
            <Skeleton className="h-20 w-20 rounded-full" style={{ boxShadow: '0 0 0 4px var(--color-card)' }} />
            <div className="flex items-center gap-2 pb-1">
              <Skeleton className="h-12 w-16 rounded-xl" />
              <Skeleton className="h-12 w-16 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-2.5 w-44" />
        </div>
      </div>

      {/* Stats card */}
      <div className="rounded-2xl border border-[var(--color-border)] p-4 space-y-3 bg-[var(--color-card-elevated)]">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <Skeleton className="h-12 rounded-xl" />
      </div>

      {/* Chart */}
      <div>
        <Skeleton className="h-3.5 w-20 mb-3" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
