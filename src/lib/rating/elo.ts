// Elo レーティング計算 — Pure Functions
// DB・Supabase に一切依存しない。テスト容易性のために独立モジュールとして実装。

import type { MatchFormat } from '@/types/database';

// ────────────────────────────────────────────────────────────
// 設定型
// ────────────────────────────────────────────────────────────

export interface RatingSettings {
  eloScale: number;
  kNew: number;
  kNormal: number;
  kStable: number;
  newUntilMatches: number;
  stableFromMatches: number;
  bestOf3StraightMultiplier: number;
  bestOf3FullMultiplier: number;
  bestOf5StraightMultiplier: number;
  bestOf5FourGameMultiplier: number;
  bestOf5FullMultiplier: number;
}

export const DEFAULT_RATING_SETTINGS: RatingSettings = {
  eloScale: 400,
  kNew: 48,
  kNormal: 32,
  kStable: 24,
  newUntilMatches: 10,
  stableFromMatches: 30,
  bestOf3StraightMultiplier: 1.15,
  bestOf3FullMultiplier: 1.00,
  bestOf5StraightMultiplier: 1.25,
  bestOf5FourGameMultiplier: 1.10,
  bestOf5FullMultiplier: 1.00,
};

// ────────────────────────────────────────────────────────────
// K値取得
// ────────────────────────────────────────────────────────────

export function getKFactor(
  approvedMatchCount: number,
  settings: Pick<RatingSettings, 'kNew' | 'kNormal' | 'kStable' | 'newUntilMatches' | 'stableFromMatches'>
): number {
  if (approvedMatchCount < settings.newUntilMatches) return settings.kNew;
  if (approvedMatchCount < settings.stableFromMatches) return settings.kNormal;
  return settings.kStable;
}

// ────────────────────────────────────────────────────────────
// セットカウント補正 M 取得
// ────────────────────────────────────────────────────────────

export function getSetMultiplier(
  format: MatchFormat,
  winnerSets: number,
  loserSets: number,
  settings: Pick<
    RatingSettings,
    | 'bestOf3StraightMultiplier'
    | 'bestOf3FullMultiplier'
    | 'bestOf5StraightMultiplier'
    | 'bestOf5FourGameMultiplier'
    | 'bestOf5FullMultiplier'
  >
): number {
  if (format === 'best_of_3') {
    if (winnerSets === 2 && loserSets === 0) return settings.bestOf3StraightMultiplier;
    return settings.bestOf3FullMultiplier;
  }
  // best_of_5
  if (winnerSets === 3 && loserSets === 0) return settings.bestOf5StraightMultiplier;
  if (winnerSets === 3 && loserSets === 1) return settings.bestOf5FourGameMultiplier;
  return settings.bestOf5FullMultiplier;
}

// ────────────────────────────────────────────────────────────
// 期待勝率
// ────────────────────────────────────────────────────────────

export function getExpectedScore(
  ratingA: number,
  ratingB: number,
  eloScale: number = 400
): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / eloScale));
}

// ────────────────────────────────────────────────────────────
// レート更新計算
// ────────────────────────────────────────────────────────────

export interface MatchInput {
  playerAId: string;
  playerBId: string;
  winnerId: string;
  format: MatchFormat;
  playerASets: number;
  playerBSets: number;
}

export interface PlayerInput {
  userId: string;
  rating: number;
  approvedMatchCount: number;
}

export interface PlayerDelta {
  userId: string;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
  result: 'win' | 'loss';
}

export interface RatingUpdateResult {
  playerA: PlayerDelta;
  playerB: PlayerDelta;
}

export function calculateRatingUpdate(
  match: MatchInput,
  playerA: PlayerInput,
  playerB: PlayerInput,
  settings: RatingSettings = DEFAULT_RATING_SETTINGS
): RatingUpdateResult {
  const aWon = match.winnerId === match.playerAId;
  const winnerSets = aWon ? match.playerASets : match.playerBSets;
  const loserSets  = aWon ? match.playerBSets : match.playerASets;

  const expectedA = getExpectedScore(playerA.rating, playerB.rating, settings.eloScale);
  const expectedB = 1 - expectedA;

  const scoreA = aWon ? 1 : 0;
  const scoreB = 1 - scoreA;

  const kA = getKFactor(playerA.approvedMatchCount, settings);
  const kB = getKFactor(playerB.approvedMatchCount, settings);

  const multiplier = getSetMultiplier(match.format, winnerSets, loserSets, settings);

  const changeA = kA * multiplier * (scoreA - expectedA);
  const changeB = kB * multiplier * (scoreB - expectedB);

  return {
    playerA: {
      userId: playerA.userId,
      ratingBefore: playerA.rating,
      ratingAfter: playerA.rating + changeA,
      ratingChange: changeA,
      result: aWon ? 'win' : 'loss',
    },
    playerB: {
      userId: playerB.userId,
      ratingBefore: playerB.rating,
      ratingAfter: playerB.rating + changeB,
      ratingChange: changeB,
      result: aWon ? 'loss' : 'win',
    },
  };
}

// ────────────────────────────────────────────────────────────
// 表示用ヘルパー
// ────────────────────────────────────────────────────────────

export function displayRating(rating: number): number {
  return Math.round(rating);
}

export function displayRatingChange(change: number): string {
  const rounded = Math.round(change);
  return rounded >= 0 ? `+${rounded}` : `${rounded}`;
}

// GroupRatingSettings (DB型) を RatingSettings (計算用) に変換
export function toRatingSettings(db: {
  elo_scale: number;
  k_new: number;
  k_normal: number;
  k_stable: number;
  new_until_matches: number;
  stable_from_matches: number;
  best_of_3_straight_multiplier: number;
  best_of_3_full_multiplier: number;
  best_of_5_straight_multiplier: number;
  best_of_5_four_game_multiplier: number;
  best_of_5_full_multiplier: number;
}): RatingSettings {
  return {
    eloScale: db.elo_scale,
    kNew: db.k_new,
    kNormal: db.k_normal,
    kStable: db.k_stable,
    newUntilMatches: db.new_until_matches,
    stableFromMatches: db.stable_from_matches,
    bestOf3StraightMultiplier: db.best_of_3_straight_multiplier,
    bestOf3FullMultiplier: db.best_of_3_full_multiplier,
    bestOf5StraightMultiplier: db.best_of_5_straight_multiplier,
    bestOf5FourGameMultiplier: db.best_of_5_four_game_multiplier,
    bestOf5FullMultiplier: db.best_of_5_full_multiplier,
  };
}
