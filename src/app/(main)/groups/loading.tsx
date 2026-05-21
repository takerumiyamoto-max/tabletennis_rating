import { Skeleton } from '@/components/ui/skeleton';

export default function GroupsLoading() {
  return (
    <div className="px-4 pt-6 pb-20 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-6 w-28" />
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 mb-1" />
          {[0, 1].map(i => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-24 mb-1" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
