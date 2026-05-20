import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankingEntry } from '@/types/app';

interface RankingListProps {
  entries: RankingEntry[];
  currentUserId: string;
}

const MEDAL_COLORS = ['text-yellow-400', 'text-slate-400', 'text-amber-600'];

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

        return (
          <div
            key={entry.user_id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border transition-all',
              isMe
                ? 'border-[var(--color-primary)]/40 bg-[var(--color-neon-dim)] neon-glow'
                : 'border-[var(--color-border)] bg-[var(--color-card)]'
            )}
          >
            {/* 順位 */}
            <div className="w-8 text-center shrink-0">
              {entry.rank <= 3 ? (
                <Medal className={cn('h-5 w-5 mx-auto', MEDAL_COLORS[entry.rank - 1])} />
              ) : (
                <span className="text-sm font-bold text-[var(--color-muted-foreground)]">
                  {entry.rank}
                </span>
              )}
            </div>

            {/* アバター */}
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={entry.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{entry.nickname[0]}</AvatarFallback>
            </Avatar>

            {/* 名前 + バッジ */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn('text-sm font-semibold truncate', isMe && 'text-[var(--color-primary)]')}>
                  {entry.nickname}
                  {isMe && <span className="text-xs font-normal ml-1">(自分)</span>}
                </span>
                {entry.is_provisional && (
                  <Badge variant="provisional" className="text-[10px] px-1.5 py-0">仮</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                <span className="text-[var(--color-win)]">{entry.wins}勝</span>
                <span>/</span>
                <span className="text-[var(--color-loss)]">{entry.losses}敗</span>
                <span>({winRate}%)</span>
                {hasStreak && (
                  <span className={streakWin ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}>
                    {streakWin ? `${entry.current_streak}連勝` : `${Math.abs(entry.current_streak)}連敗`}
                  </span>
                )}
              </div>
            </div>

            {/* レーティング */}
            <div className="text-right shrink-0">
              <p className={cn(
                'text-lg font-black tabular-nums',
                isMe ? 'neon-text' : 'text-[var(--color-foreground)]'
              )}>
                {entry.rating_display}
              </p>
              {entry.rating_change_today !== null && (
                <div className={cn(
                  'flex items-center justify-end gap-0.5 text-xs font-medium',
                  entry.rating_change_today > 0 ? 'text-[var(--color-win)]' : entry.rating_change_today < 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-muted-foreground)]'
                )}>
                  {entry.rating_change_today > 0
                    ? <TrendingUp className="h-3 w-3" />
                    : entry.rating_change_today < 0
                    ? <TrendingDown className="h-3 w-3" />
                    : <Minus className="h-3 w-3" />}
                  {entry.rating_change_today > 0 ? `+${Math.round(entry.rating_change_today)}` : Math.round(entry.rating_change_today)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
