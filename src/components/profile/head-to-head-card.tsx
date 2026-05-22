import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { HeadToHeadEntry } from '@/types/app';

interface HeadToHeadCardProps {
  entries: HeadToHeadEntry[];
}

export function HeadToHeadCard({ entries }: HeadToHeadCardProps) {
  if (entries.length === 0) {
    return (
      <div>
        <h2 className="font-semibold text-sm mb-3">対戦相性</h2>
        <p className="text-center text-[var(--color-muted-foreground)] text-sm py-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          まだ対戦データがありません
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-semibold text-sm mb-3">対戦相性</h2>
      <div className="space-y-1.5">
        {entries.map((entry) => {
          const dominant = entry.winRate >= 60;
          const weak     = entry.winRate < 40;

          return (
            <Link
              key={entry.opponentId}
              href={`/players/${entry.opponentId}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-neon-dim)] transition-all group"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={entry.opponentAvatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">{entry.opponentNickname[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate group-hover:text-[var(--color-primary)] transition-colors">
                    {entry.opponentNickname}
                  </p>
                  {dominant && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-win)]/15 text-[var(--color-win)] border border-[var(--color-win)]/30 shrink-0">
                      得意
                    </span>
                  )}
                  {weak && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-loss)]/15 text-[var(--color-loss)] border border-[var(--color-loss)]/30 shrink-0">
                      苦手
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
                  {entry.opponentRating}pt · {formatDate(entry.lastPlayedAt)}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-black tabular-nums">
                  <span className="text-[var(--color-win)]">{entry.wins}</span>
                  <span className="text-[var(--color-muted-foreground)] mx-1 text-xs">-</span>
                  <span className="text-[var(--color-loss)]">{entry.losses}</span>
                </p>
                <p className={cn(
                  'text-[10px] font-semibold tabular-nums',
                  dominant ? 'text-[var(--color-win)]' : weak ? 'text-[var(--color-loss)]' : 'text-[var(--color-muted-foreground)]',
                )}>
                  {entry.winRate}%
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
