// アプリケーション固有の型 (DB型をJOINしたビュー型など)

import type { Group, GroupMember, MemberRole, MatchFormat, MatchResult, MatchStatus, PlayerRating, Profile, RatingHistory, Match, InitialRatingLabel } from './database';

// ────────────────────────────────────────────────────────────
// Auth / User
// ────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string | null;
}

// ────────────────────────────────────────────────────────────
// プロフィール + グループメンバー情報
// ────────────────────────────────────────────────────────────

export interface MemberWithProfile extends GroupMember {
  profile: Profile;
  player_rating?: PlayerRating;
}

// ────────────────────────────────────────────────────────────
// グループ + 自分のメンバー情報
// ────────────────────────────────────────────────────────────

export interface GroupWithMyRole extends Group {
  my_role: MemberRole;
  my_status: string;
  member_count: number;
}

// ────────────────────────────────────────────────────────────
// ランキング表示用
// ────────────────────────────────────────────────────────────

export interface RankingEntry {
  rank: number;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  rating: number;
  rating_display: number;       // Math.round(rating)
  initial_rating: number;
  wins: number;
  losses: number;
  approved_match_count: number;
  is_provisional: boolean;
  current_streak: number;
  highest_rating: number;
  rating_change_today: number | null;
}

// ────────────────────────────────────────────────────────────
// 試合履歴表示用
// ────────────────────────────────────────────────────────────

export interface MatchHistoryEntry {
  match: Match;
  opponent: Profile;
  result: MatchResult;
  rating_change: number;
  rating_before: number;
  rating_after: number;
  my_sets: number;
  opponent_sets: number;
}

// ────────────────────────────────────────────────────────────
// 承認待ち試合表示用
// ────────────────────────────────────────────────────────────

export interface PendingMatchEntry {
  match: Match;
  submitter: Profile;
  opponent: Profile;
  is_approval_target: boolean;  // 自分が承認すべき側かどうか
}

// ────────────────────────────────────────────────────────────
// レート推移グラフ用
// ────────────────────────────────────────────────────────────

export interface RatingChartPoint {
  date: string;
  rating: number;
  rating_display: number;
  match_id: string;
  result: MatchResult;
  opponent_nickname: string;
}

// ────────────────────────────────────────────────────────────
// マイページ統計
// ────────────────────────────────────────────────────────────

export interface MyStats {
  rating: number;
  rating_display: number;
  rank: number;
  total_members: number;
  wins: number;
  losses: number;
  approved_match_count: number;
  win_rate: number;
  current_streak: number;
  highest_rating: number;
  highest_rating_display: number;
  is_provisional: boolean;
}

// ────────────────────────────────────────────────────────────
// 試合入力フォーム
// ────────────────────────────────────────────────────────────

export interface MatchFormValues {
  opponent_id: string;
  winner_id: string;
  match_format: MatchFormat;
  player_a_sets: number;
  player_b_sets: number;
}

// ────────────────────────────────────────────────────────────
// オンボーディング
// ────────────────────────────────────────────────────────────

export type OnboardingStep =
  | 'profile'
  | 'group_choice'   // 作成 or 参加
  | 'group_create'
  | 'group_join'
  | 'rating_label';

export interface OnboardingState {
  step: OnboardingStep;
  nickname: string;
  avatar_url: string | null;
  group_id: string | null;
  initial_rating_label_id: string | null;
}

// ────────────────────────────────────────────────────────────
// 通知タイプ
// ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'match_approval_request'
  | 'match_approved'
  | 'match_rejected'
  | 'match_cancelled'
  | 'rating_updated';

// ────────────────────────────────────────────────────────────
// API レスポンス汎用
// ────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ────────────────────────────────────────────────────────────
// 試合フィード
// ────────────────────────────────────────────────────────────

export interface FeedEntry {
  matchId: string;
  approvedAt: string;
  matchFormat: MatchFormat;
  winnerId: string;
  loserId: string;
  winnerNickname: string;
  winnerAvatarUrl: string | null;
  loserNickname: string;
  loserAvatarUrl: string | null;
  playerASets: number;
  playerBSets: number;
  playerAId: string;
  playerBId: string;
  winnerRatingChange: number;
  loserRatingChange: number;
  winnerRatingBefore: number;
  loserRatingBefore: number;
  isGiantKilling: boolean;
  giantKillingDiff: number;
}

// ────────────────────────────────────────────────────────────
// 週間成長ランキング
// ────────────────────────────────────────────────────────────

export interface WeeklyRankEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  totalChange: number;
  matchCount: number;
  currentRating: number;
}

// ────────────────────────────────────────────────────────────
// 対戦相性
// ────────────────────────────────────────────────────────────

export interface HeadToHeadEntry {
  opponentId: string;
  opponentNickname: string;
  opponentAvatarUrl: string | null;
  opponentRating: number;
  wins: number;
  losses: number;
  winRate: number;
  lastPlayedAt: string;
  totalMatches: number;
}

// ────────────────────────────────────────────────────────────
// 自己ベスト
// ────────────────────────────────────────────────────────────

export interface PersonalBests {
  highestRating: number;
  lowestRating: number;
  currentRating: number;
  maxSingleMatchGain: number;
  giantKillingCount: number;
  weeklyRatingChange: number;
  currentStreak: number;
  wins: number;
  totalMatches: number;
}

// re-export DB types for convenience
export type { Group, GroupMember, MemberRole, MatchFormat, MatchResult, MatchStatus, PlayerRating, Profile, RatingHistory, Match, InitialRatingLabel };
