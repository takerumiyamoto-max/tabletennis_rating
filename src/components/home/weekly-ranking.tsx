'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeeklyRankEntry } from '@/types/app';

interface WeeklyRankingProps {
  entries: WeeklyRankEntry[];
}

export function WeeklyRanking({ entries }: WeeklyRankingProps) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-[var(--color-muted-foreground)] text-sm py-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        今週はまだ試合がありません
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <Link
          key={entry.userId}
          href={`/players/${entry.userId}`}
          className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-neon-dim)] transition-all group"
        >
          <span className={cn(
            'w-5 text-center text-xs font-black tabular-nums shrink-0',
            entry.rank === 1 ? 'text-[var(--color-gold)]' : 'text-[var(--color-muted-foreground)]',
          )}>
            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
          </span>

          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={entry.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[10px]">{entry.nickname[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate group-hover:text-[var(--color-primary)] transition-colors">
              {entry.nickname}
            </p>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">
              {entry.matchCount}試合 · {entry.currentRating}pt
            </p>
          </div>

          <div className="flex items-center gap-0.5 text-[var(--color-win)] shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-sm font-black tabular-nums">+{entry.totalChange}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
