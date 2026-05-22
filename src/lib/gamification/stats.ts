import type { RatingHistory } from '@/types/database';
import type { WeeklyRankEntry, PersonalBests } from '@/types/app';
import { isGiantKilling } from './highlights';

export function getSevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

export function calcWeeklyChange(histories: RatingHistory[]): number {
  const cutoff = getSevenDaysAgo();
  return histories
    .filter(h => h.created_at >= cutoff)
    .reduce((sum, h) => sum + Number(h.rating_change), 0);
}

export function calcMaxSingleGain(histories: RatingHistory[]): number {
  if (histories.length === 0) return 0;
  return Math.max(0, ...histories.map(h => Number(h.rating_change)));
}

export function calcGiantKillingCount(
  myHistories: RatingHistory[],
  opponentHistByMatchId: Map<string, RatingHistory>,
): number {
  let count = 0;
  for (const h of myHistories) {
    if (h.result !== 'win') continue;
    const opp = opponentHistByMatchId.get(h.match_id);
    if (opp && isGiantKilling(Number(h.rating_before), Number(opp.rating_before))) count++;
  }
  return count;
}

export function buildPersonalBests(
  playerRating: {
    rating: number;
    highest_rating: number;
    lowest_rating: number;
    wins: number;
    approved_match_count: number;
    current_streak: number;
  },
  myHistories: RatingHistory[],
  opponentHistByMatchId: Map<string, RatingHistory>,
): PersonalBests {
  return {
    highestRating:      Number(playerRating.highest_rating),
    lowestRating:       Number(playerRating.lowest_rating),
    currentRating:      Number(playerRating.rating),
    wins:               playerRating.wins,
    totalMatches:       playerRating.approved_match_count,
    currentStreak:      playerRating.current_streak,
    maxSingleMatchGain: calcMaxSingleGain(myHistories),
    giantKillingCount:  calcGiantKillingCount(myHistories, opponentHistByMatchId),
    weeklyRatingChange: calcWeeklyChange(myHistories),
  };
}

type PartialProfile = { user_id: string; nickname: string; avatar_url: string | null };
type WeeklyHistory  = Pick<RatingHistory, 'user_id' | 'rating_change' | 'created_at'>;

export function buildWeeklyRanking(
  weeklyHistories: WeeklyHistory[],
  profileMap: Map<string, PartialProfile>,
  ratingMap: Map<string, number>,
): WeeklyRankEntry[] {
  const cutoff = getSevenDaysAgo();
  const recent = weeklyHistories.filter(h => h.created_at >= cutoff);

  const byUser = new Map<string, { totalChange: number; matchCount: number }>();
  for (const h of recent) {
    const cur = byUser.get(h.user_id) ?? { totalChange: 0, matchCount: 0 };
    byUser.set(h.user_id, {
      totalChange: cur.totalChange + Number(h.rating_change),
      matchCount:  cur.matchCount + 1,
    });
  }

  const entries: WeeklyRankEntry[] = [];
  for (const [userId, agg] of byUser) {
    if (agg.totalChange <= 0) continue;
    const profile = profileMap.get(userId);
    if (!profile) continue;
    entries.push({
      rank:          0,
      userId,
      nickname:      profile.nickname,
      avatarUrl:     profile.avatar_url,
      totalChange:   Math.round(agg.totalChange),
      matchCount:    agg.matchCount,
      currentRating: Math.round(ratingMap.get(userId) ?? 0),
    });
  }

  entries.sort((a, b) => b.totalChange - a.totalChange);
  entries.forEach((e, i) => { e.rank = i + 1; });
  return entries.slice(0, 5);
}
