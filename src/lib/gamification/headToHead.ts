import type { Match } from '@/types/database';
import type { HeadToHeadEntry } from '@/types/app';

type PartialProfile = { user_id: string; nickname: string; avatar_url: string | null };

export function buildHeadToHead(
  matches: Match[],
  userId: string,
  profileMap: Map<string, PartialProfile>,
  ratingMap: Map<string, number>,
): HeadToHeadEntry[] {
  const stats = new Map<string, { wins: number; losses: number; lastPlayedAt: string }>();

  for (const m of matches) {
    const opponentId = m.player_a_id === userId ? m.player_b_id : m.player_a_id;
    const won        = m.winner_id === userId;
    const playedAt   = m.approved_at ?? m.created_at;
    const cur        = stats.get(opponentId) ?? { wins: 0, losses: 0, lastPlayedAt: '' };
    stats.set(opponentId, {
      wins:         cur.wins   + (won ? 1 : 0),
      losses:       cur.losses + (won ? 0 : 1),
      lastPlayedAt: playedAt > cur.lastPlayedAt ? playedAt : cur.lastPlayedAt,
    });
  }

  const entries: HeadToHeadEntry[] = [];
  for (const [opponentId, s] of stats) {
    const profile = profileMap.get(opponentId);
    const total   = s.wins + s.losses;
    entries.push({
      opponentId,
      opponentNickname:  profile?.nickname    ?? '?',
      opponentAvatarUrl: profile?.avatar_url  ?? null,
      opponentRating:    Math.round(ratingMap.get(opponentId) ?? 0),
      wins:              s.wins,
      losses:            s.losses,
      winRate:           total > 0 ? Math.round((s.wins / total) * 100) : 0,
      lastPlayedAt:      s.lastPlayedAt,
      totalMatches:      total,
    });
  }

  entries.sort((a, b) => b.totalMatches - a.totalMatches);
  return entries.slice(0, 10);
}
