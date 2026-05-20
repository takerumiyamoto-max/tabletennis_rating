import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { displayRatingChange } from '@/lib/rating/elo';
import type { RatingHistory, Match, Profile } from '@/types/database';

type ProfileInfo = Pick<Profile, 'user_id' | 'nickname' | 'avatar_url'>;

interface BaseProps {
  profileMap: Map<string, ProfileInfo>;
  currentUserId: string;
}

interface MineProps extends BaseProps {
  mode: 'mine';
  histories: (RatingHistory & { matches: Pick<Match, 'match_format' | 'player_a_sets' | 'player_b_sets' | 'player_a_id' | 'player_b_id' | 'status'> | null })[];
  matches?: never;
}

interface GroupProps extends BaseProps {
  mode: 'group';
  matches: Match[];
  histories?: never;
}

type Props = MineProps | GroupProps;

export function MatchHistoryList(props: Props) {
  if (props.mode === 'mine') {
    const { histories, profileMap } = props;
    if (histories.length === 0) {
      return <EmptyState message="まだ試合がありません" />;
    }
    return (
      <div className="space-y-2">
        {histories.map((h) => {
          const opponent = profileMap.get(h.opponent_id);
          const isWin = h.result === 'win';
          const change = h.rating_change;
          const m = h.matches;

          return (
            <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={opponent?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{opponent?.nickname?.[0] ?? '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{opponent?.nickname ?? '不明'}</span>
                  <Badge variant={isWin ? 'win' : 'loss'} className="text-xs shrink-0">{isWin ? '勝' : '負'}</Badge>
                  {m && (
                    <span className="text-xs text-[var(--color-muted-foreground)] shrink-0">
                      {m.player_a_id === props.currentUserId
                        ? `${m.player_a_sets}-${m.player_b_sets}`
                        : `${m.player_b_sets}-${m.player_a_sets}`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)]">{formatDateTime(h.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`flex items-center gap-0.5 text-sm font-bold justify-end ${change >= 0 ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}`}>
                  {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {displayRatingChange(change)}
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)]">{Math.round(h.rating_after)}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // group mode
  const { matches, profileMap, currentUserId } = props;
  if (matches.length === 0) {
    return <EmptyState message="まだ試合がありません" />;
  }

  return (
    <div className="space-y-2">
      {matches.map((m) => {
        const playerA = profileMap.get(m.player_a_id);
        const playerB = profileMap.get(m.player_b_id);
        const aWon = m.winner_id === m.player_a_id;

        return (
          <div key={m.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="flex items-center gap-2">
              <div className={`flex-1 flex items-center gap-2 min-w-0 ${aWon ? '' : 'opacity-60'}`}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={playerA?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{playerA?.nickname?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold truncate">{playerA?.nickname ?? '?'}</span>
                {aWon && <Badge variant="win" className="text-[10px] shrink-0">勝</Badge>}
              </div>
              <div className="text-center shrink-0 px-2">
                <p className="text-base font-black">
                  <span className={aWon ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}>{m.player_a_sets}</span>
                  <span className="text-[var(--color-muted-foreground)] mx-0.5">-</span>
                  <span className={!aWon ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}>{m.player_b_sets}</span>
                </p>
              </div>
              <div className={`flex-1 flex items-center gap-2 justify-end min-w-0 ${!aWon ? '' : 'opacity-60'}`}>
                {!aWon && <Badge variant="win" className="text-[10px] shrink-0">勝</Badge>}
                <span className="text-sm font-semibold truncate text-right">{playerB?.nickname ?? '?'}</span>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={playerB?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{playerB?.nickname?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 text-center">
              {formatDateTime(m.approved_at ?? m.created_at)} · {m.match_format === 'best_of_5' ? '5G制' : '3G制'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-center text-[var(--color-muted-foreground)] text-sm py-12">{message}</p>
  );
}
