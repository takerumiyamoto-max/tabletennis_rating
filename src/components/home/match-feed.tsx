'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StaggerList, StaggerItem } from '@/components/ui/motion';
import { Swords, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { FeedEntry } from '@/types/app';

interface MatchFeedProps {
  entries: FeedEntry[];
}

export function MatchFeed({ entries }: MatchFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--color-muted-foreground)] text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <Swords className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>まだ試合がありません</p>
      </div>
    );
  }

  return (
    <StaggerList className="space-y-2">
      {entries.map((entry) => {
        const winnerSets = entry.playerAId === entry.winnerId ? entry.playerASets : entry.playerBSets;
        const loserSets  = entry.playerAId === entry.winnerId ? entry.playerBSets : entry.playerASets;

        return (
          <StaggerItem key={entry.matchId}>
            <div className={cn(
              'p-3 rounded-xl border bg-[var(--color-card)] shadow-card transition-all',
              entry.isGiantKilling
                ? 'border-[var(--color-gold)]/40 bg-gradient-to-r from-[var(--color-gold)]/5 to-[var(--color-card)]'
                : 'border-[var(--color-border)]',
            )}>
              {/* Giant killing badge */}
              {entry.isGiantKilling && (
                <div className="flex items-center gap-1 mb-2">
                  <Flame className="h-3 w-3 text-[var(--color-gold)]" />
                  <span className="text-[10px] font-bold text-[var(--color-gold)] uppercase tracking-wider">
                    Giant Killing · +{entry.giantKillingDiff}差撃破
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Winner */}
                <Link href={`/players/${entry.winnerId}`} className="flex items-center gap-2 flex-1 min-w-0 group">
                  <Avatar className="h-8 w-8 shrink-0 ring-1 ring-[var(--color-win)]/40">
                    <AvatarImage src={entry.winnerAvatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">{entry.winnerNickname[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate group-hover:text-[var(--color-primary)] transition-colors">
                      {entry.winnerNickname}
                    </p>
                    <div className="flex items-center gap-0.5 text-[var(--color-win)]">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs font-bold tabular-nums">+{Math.round(entry.winnerRatingChange)}</span>
                    </div>
                  </div>
                </Link>

                {/* Score */}
                <div className="text-center shrink-0 px-2">
                  <p className="text-base font-black tabular-nums">
                    <span className="text-[var(--color-win)]">{winnerSets}</span>
                    <span className="text-[var(--color-muted-foreground)] mx-1 text-sm">-</span>
                    <span className="text-[var(--color-loss)]">{loserSets}</span>
                  </p>
                  <p className="text-[9px] text-[var(--color-muted-foreground)] mt-0.5">
                    {entry.matchFormat === 'best_of_5' ? '5G' : '3G'}
                  </p>
                </div>

                {/* Loser */}
                <Link href={`/players/${entry.loserId}`} className="flex items-center gap-2 flex-1 min-w-0 justify-end group">
                  <div className="text-right min-w-0">
                    <p className="text-sm font-semibold truncate opacity-60 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all">
                      {entry.loserNickname}
                    </p>
                    <div className="flex items-center gap-0.5 text-[var(--color-loss)] justify-end">
                      <TrendingDown className="h-3 w-3" />
                      <span className="text-xs font-bold tabular-nums">{Math.round(entry.loserRatingChange)}</span>
                    </div>
                  </div>
                  <Avatar className="h-8 w-8 shrink-0 opacity-60">
                    <AvatarImage src={entry.loserAvatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">{entry.loserNickname[0]}</AvatarFallback>
                  </Avatar>
                </Link>
              </div>

              <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1.5 text-right">
                {formatRelativeTime(entry.approvedAt)}
              </p>
            </div>
          </StaggerItem>
        );
      })}
    </StaggerList>
  );
}
