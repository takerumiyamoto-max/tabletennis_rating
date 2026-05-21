import { Skeleton } from '@/components/ui/skeleton';

export default function MatchLoading() {
  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <Skeleton className="h-6 w-20 mb-6" />

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            {i < 2 && <Skeleton className="w-10 h-0.5 rounded-none" />}
          </div>
        ))}
      </div>

      {/* Form area */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24 mb-1" />
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
