import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankingEntry } from '@/types/app';

interface RankingListProps {
  entries: RankingEntry[];
  currentUserId: string;
}

const RANK_STYLES = [
  {
    border: 'border-[var(--color-gold)]/50',
    bg: 'gradient-gold',
    medal: '🥇',
    medalColor: 'text-[var(--color-gold)]',
    ratingColor: 'text-[var(--color-gold)]',
    shadow: '0 2px 16px rgba(245,158,11,0.15)',
  },
  {
    border: 'border-[var(--color-silver)]/40',
    bg: 'gradient-silver',
    medal: '🥈',
    medalColor: 'text-[var(--color-silver)]',
    ratingColor: 'text-[var(--color-silver)]',
    shadow: '0 2px 12px rgba(148,163,184,0.12)',
  },
  {
    border: 'border-[var(--color-bronze)]/40',
    bg: 'gradient-bronze',
    medal: '🥉',
    medalColor: 'text-[var(--color-bronze)]',
    ratingColor: 'text-amber-600',
    shadow: '0 2px 12px rgba(180,83,9,0.12)',
  },
];

export function RankingList({ entries, currentUserId }: RankingListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-[var(--color-muted-foreground)] py-12">
        メンバーがいません
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isMe = entry.user_id === currentUserId;
        const winRate = entry.wins + entry.losses > 0
          ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100)
          : 0;
        const hasStreak = entry.current_streak !== 0;
        const streakWin = entry.current_streak > 0;
        const topStyle = entry.rank <= 3 ? RANK_STYLES[entry.rank - 1] : null;

        return (
          <div
            key={entry.user_id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border transition-all',
              topStyle ? `${topStyle.bg} ${topStyle.border}` : isMe
                ? 'border-[var(--color-primary)]/40 bg-[var(--color-neon-dim)]'
                : 'border-[var(--color-border)] bg-[var(--color-card)]'
            )}
            style={{
              boxShadow: topStyle ? topStyle.shadow : isMe ? 'var(--shadow-neon-sm)' : 'var(--shadow-card)',
            }}
          >
            {/* 順位 */}
            <div className="w-9 text-center shrink-0">
              {topStyle ? (
                <span className="text-2xl leading-none">{topStyle.medal}</span>
              ) : (
                <span className={cn(
                  'text-sm font-black tabular-nums',
                  isMe ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]'
                )}>
                  {entry.rank}
                </span>
              )}
            </div>

            {/* アバター */}
            <Avatar className={cn(
              'shrink-0',
              entry.rank === 1 ? 'h-11 w-11' : 'h-9 w-9',
              isMe && 'ring-2 ring-[var(--color-primary)]/60'
            )}>
              <AvatarImage src={entry.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{entry.nickname[0]}</AvatarFallback>
            </Avatar>

            {/* 名前 + サブ情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn(
                  'font-bold truncate',
                  entry.rank === 1 ? 'text-base' : 'text-sm',
                  isMe ? 'text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'
                )}>
                  {entry.nickname}
                  {isMe && <span className="text-[10px] font-normal ml-1 text-[var(--color-muted-foreground)]">YOU</span>}
                </span>
                {entry.is_provisional && (
                  <Badge variant="provisional" className="text-[10px] px-1.5 py-0">仮</Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                <span className="text-[var(--color-win)] font-semibold">{entry.wins}勝</span>
                <span className="text-[var(--color-loss)] font-semibold">{entry.losses}敗</span>
                <span className="opacity-60">·</span>
                <span>{winRate}%</span>
                {hasStreak && (
                  <>
                    <span className="opacity-60">·</span>
                    <span className={streakWin ? 'text-[var(--color-win)] font-semibold' : 'text-[var(--color-loss)] font-semibold'}>
                      {streakWin ? `${entry.current_streak}連勝` : `${Math.abs(entry.current_streak)}連敗`}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* レーティング */}
            <div className="text-right shrink-0">
              <p className={cn(
                'font-black tabular-nums leading-none',
                entry.rank === 1 ? 'text-2xl' : 'text-xl',
                topStyle ? topStyle.ratingColor : isMe ? 'neon-text' : 'text-[var(--color-foreground)]'
              )}>
                {entry.rating_display}
              </p>
              {entry.rating_change_today !== null && (
                <div className={cn(
                  'flex items-center justify-end gap-0.5 text-[10px] font-semibold mt-0.5',
                  entry.rating_change_today > 0
                    ? 'text-[var(--color-win)]'
                    : entry.rating_change_today < 0
                    ? 'text-[var(--color-loss)]'
                    : 'text-[var(--color-muted-foreground)]'
                )}>
                  {entry.rating_change_today > 0
                    ? <TrendingUp className="h-3 w-3" />
                    : entry.rating_change_today < 0
                    ? <TrendingDown className="h-3 w-3" />
                    : <Minus className="h-3 w-3" />}
                  <span>
                    {entry.rating_change_today > 0
                      ? `+${Math.round(entry.rating_change_today)}`
                      : Math.round(entry.rating_change_today)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
