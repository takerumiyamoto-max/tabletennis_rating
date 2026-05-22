import type { RatingHistory, MatchFormat } from '@/types/database';
import type { FeedEntry } from '@/types/app';

export const GIANT_KILLING_THRESHOLD = 100;

export function isGiantKilling(winnerRatingBefore: number, loserRatingBefore: number): boolean {
  return loserRatingBefore - winnerRatingBefore >= GIANT_KILLING_THRESHOLD;
}

export function getGiantKillingDiff(winnerRatingBefore: number, loserRatingBefore: number): number {
  return loserRatingBefore - winnerRatingBefore;
}

type PartialMatch = {
  id: string;
  approved_at: string | null;
  created_at: string;
  match_format: MatchFormat;
  player_a_id: string;
  player_b_id: string;
  winner_id: string;
  player_a_sets: number;
  player_b_sets: number;
};

type PartialProfile = { user_id: string; nickname: string; avatar_url: string | null };

export function buildFeedEntries(
  matches: PartialMatch[],
  histories: RatingHistory[],
  profileMap: Map<string, PartialProfile>,
): FeedEntry[] {
  const histByMatch = new Map<string, RatingHistory[]>();
  for (const h of histories) {
    const arr = histByMatch.get(h.match_id) ?? [];
    arr.push(h);
    histByMatch.set(h.match_id, arr);
  }

  const entries: FeedEntry[] = [];
  for (const m of matches) {
    const matchHists = histByMatch.get(m.id) ?? [];
    const winnerHist = matchHists.find(h => h.user_id === m.winner_id);
    const loserId    = m.winner_id === m.player_a_id ? m.player_b_id : m.player_a_id;
    const loserHist  = matchHists.find(h => h.user_id === loserId);
    if (!winnerHist || !loserHist) continue;

    const winnerProfile = profileMap.get(m.winner_id);
    const loserProfile  = profileMap.get(loserId);
    const gkDiff = getGiantKillingDiff(Number(winnerHist.rating_before), Number(loserHist.rating_before));

    entries.push({
      matchId:            m.id,
      approvedAt:         m.approved_at ?? m.created_at,
      matchFormat:        m.match_format,
      winnerId:           m.winner_id,
      loserId,
      winnerNickname:     winnerProfile?.nickname   ?? '?',
      winnerAvatarUrl:    winnerProfile?.avatar_url ?? null,
      loserNickname:      loserProfile?.nickname    ?? '?',
      loserAvatarUrl:     loserProfile?.avatar_url  ?? null,
      playerASets:        m.player_a_sets,
      playerBSets:        m.player_b_sets,
      playerAId:          m.player_a_id,
      playerBId:          m.player_b_id,
      winnerRatingChange: Number(winnerHist.rating_change),
      loserRatingChange:  Number(loserHist.rating_change),
      winnerRatingBefore: Number(winnerHist.rating_before),
      loserRatingBefore:  Number(loserHist.rating_before),
      isGiantKilling:     gkDiff >= GIANT_KILLING_THRESHOLD,
      giantKillingDiff:   gkDiff,
    });
  }
  return entries;
}
