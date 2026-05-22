'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StaggerList, StaggerItem } from '@/components/ui/motion';
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
    if (histories.length === 0) return <EmptyState message="まだ試合がありません" />;

    return (
      <StaggerList className="space-y-2">
        {histories.map((h) => {
          const opponent = profileMap.get(h.opponent_id);
          const isWin    = h.result === 'win';
          const change   = h.rating_change;
          const m        = h.matches;
          const score    = m
            ? m.player_a_id === props.currentUserId
              ? `${m.player_a_sets}-${m.player_b_sets}`
              : `${m.player_b_sets}-${m.player_a_sets}`
            : null;

          return (
            <StaggerItem key={h.id}>
              <div
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] border-l-4 shadow-card"
                style={{ borderLeftColor: isWin ? 'var(--color-win)' : 'var(--color-loss)' }}
              >
                <Link href={`/players/${h.opponent_id}`} className="shrink-0">
                  <Avatar className="h-9 w-9 hover:ring-1 hover:ring-[var(--color-primary)]/50 transition-all">
                    <AvatarImage src={opponent?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{opponent?.nickname?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link href={`/players/${h.opponent_id}`} className="text-sm font-semibold truncate hover:text-[var(--color-primary)] transition-colors">
                      {opponent?.nickname ?? '不明'}
                    </Link>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${isWin ? 'bg-[var(--color-win)]/15 text-[var(--color-win)]' : 'bg-[var(--color-loss)]/15 text-[var(--color-loss)]'}`}>
                      {isWin ? '勝利' : '敗北'}
                    </span>
                    {score && (
                      <span className="text-xs font-black text-[var(--color-muted-foreground)] shrink-0 tabular-nums">{score}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{formatDateTime(h.created_at)}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className={`flex items-center gap-0.5 text-sm font-bold justify-end ${change >= 0 ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}`}>
                    {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span className="tabular-nums">{displayRatingChange(change)}</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] tabular-nums">{Math.round(h.rating_after)}</p>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerList>
    );
  }

  // group mode
  const { matches, profileMap } = props;
  if (matches.length === 0) return <EmptyState message="まだ試合がありません" />;

  return (
    <StaggerList className="space-y-2">
      {matches.map((m) => {
        const playerA = profileMap.get(m.player_a_id);
        const playerB = profileMap.get(m.player_b_id);
        const aWon    = m.winner_id === m.player_a_id;

        return (
          <StaggerItem key={m.id}>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-card">
              <div className="flex items-center gap-2">
                <Link href={`/players/${m.player_a_id}`} className={`flex-1 flex items-center gap-2 min-w-0 group ${!aWon ? 'opacity-50 hover:opacity-80' : ''}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={playerA?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{playerA?.nickname?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold truncate group-hover:text-[var(--color-primary)] transition-colors">{playerA?.nickname ?? '?'}</span>
                  {aWon && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-win)]/15 text-[var(--color-win)] shrink-0">勝</span>
                  )}
                </Link>

                <div className="text-center shrink-0 px-1">
                  <p className="text-lg font-black tabular-nums">
                    <span className={aWon ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}>{m.player_a_sets}</span>
                    <span className="text-[var(--color-muted-foreground)] mx-1">-</span>
                    <span className={!aWon ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}>{m.player_b_sets}</span>
                  </p>
                </div>

                <Link href={`/players/${m.player_b_id}`} className={`flex-1 flex items-center gap-2 justify-end min-w-0 group ${aWon ? 'opacity-50 hover:opacity-80' : ''}`}>
                  {!aWon && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-win)]/15 text-[var(--color-win)] shrink-0">勝</span>
                  )}
                  <span className="text-sm font-semibold truncate text-right group-hover:text-[var(--color-primary)] transition-colors">{playerB?.nickname ?? '?'}</span>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={playerB?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{playerB?.nickname?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-[var(--color-muted-foreground)]">
                <span>{formatDateTime(m.approved_at ?? m.created_at)}</span>
                <span>·</span>
                <span>{m.match_format === 'best_of_5' ? '5G制' : '3G制'}</span>
              </div>
            </div>
          </StaggerItem>
        );
      })}
    </StaggerList>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-center text-[var(--color-muted-foreground)] text-sm py-12">{message}</p>
  );
}
