import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { History, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { displayRatingChange } from '@/lib/rating/elo';
import type { RatingHistory, Profile } from '@/types/database';

interface RecentMatchesProps {
  histories: RatingHistory[];
  opponentMap: Map<string, Pick<Profile, 'user_id' | 'nickname' | 'avatar_url'>>;
}

export function RecentMatches({ histories, opponentMap }: RecentMatchesProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h2 className="font-semibold text-sm">最近の試合</h2>
        <Link href="/history" className="text-xs text-[var(--color-primary)] ml-auto hover:underline">
          すべて見る
        </Link>
      </div>

      {histories.length === 0 ? (
        <div className="text-center py-10 text-[var(--color-muted-foreground)] text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <p>まだ試合がありません</p>
          <p className="text-xs mt-1 text-[var(--color-muted-foreground)]/60">試合を入力してレーティングを始めよう！</p>
        </div>
      ) : (
        <div className="space-y-2">
          {histories.map((history) => {
            const opponent = opponentMap.get(history.opponent_id);
            const isWin = history.result === 'win';
            const change = history.rating_change;
            const changeStr = displayRatingChange(change);

            return (
              <div
                key={history.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] border-l-4 shadow-card"
                style={{ borderLeftColor: isWin ? 'var(--color-win)' : 'var(--color-loss)' }}
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={opponent?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {opponent?.nickname?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{opponent?.nickname ?? '不明'}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${isWin ? 'bg-[var(--color-win)]/15 text-[var(--color-win)]' : 'bg-[var(--color-loss)]/15 text-[var(--color-loss)]'}`}>
                      {isWin ? '勝利' : '敗北'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{formatDate(history.created_at)}</p>
                </div>

                <div className={`flex items-center gap-0.5 text-sm font-bold shrink-0 ${change >= 0 ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}`}>
                  {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span className="tabular-nums">{changeStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
