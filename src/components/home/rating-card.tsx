'use client';

import { Badge } from '@/components/ui/badge';
import { FadeInScale } from '@/components/ui/motion';
import { TrendingUp, Target, Zap, Medal } from 'lucide-react';

interface RatingCardProps {
  rating: number;
  rank: number;
  wins: number;
  losses: number;
  isProvisional: boolean;
  currentStreak: number;
  approvedMatchCount: number;
}

export function RatingCard({
  rating, rank, wins, losses, isProvisional, currentStreak, approvedMatchCount,
}: RatingCardProps) {
  const displayRating = Math.round(rating);
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const streakPositive = currentStreak > 0;
  const streakLabel = currentStreak > 0
    ? `${currentStreak}連勝`
    : currentStreak < 0
    ? `${Math.abs(currentStreak)}連敗`
    : '-';

  return (
    <FadeInScale>
      <div className="rounded-2xl relative overflow-hidden" style={{ boxShadow: 'var(--shadow-card), 0 0 24px rgba(0,200,255,0.15)' }}>
        {/* ボーダーグラデーション */}
        <div className="absolute inset-0 rounded-2xl p-px bg-gradient-to-br from-[var(--color-primary)]/50 via-[var(--color-border)] to-[var(--color-border)]">
          <div className="h-full w-full rounded-2xl bg-gradient-to-br from-[var(--color-card-elevated)] to-[var(--color-card)]" />
        </div>

        {/* 装飾グロー */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[var(--color-primary)]/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[var(--color-primary)]/5 blur-2xl pointer-events-none" />

        <div className="relative p-5">
          {/* ヘッダー: レート + 順位 */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[var(--color-muted-foreground)] text-[10px] font-semibold uppercase tracking-widest mb-1">
                RATING
              </p>
              <div className="flex items-end gap-2.5">
                <span className="text-6xl font-black neon-text tabular-nums leading-none" style={{ textShadow: '0 0 30px rgba(0,200,255,0.5)' }}>
                  {displayRating}
                </span>
                {isProvisional && (
                  <Badge variant="provisional" className="mb-1.5 text-[10px] px-2">仮</Badge>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-[var(--color-muted-foreground)] text-[10px] font-semibold uppercase tracking-widest mb-1">
                RANK
              </p>
              <div className="flex items-center gap-1.5 justify-end">
                <Medal className="h-4 w-4 text-[var(--color-gold)]" />
                <span className="text-3xl font-black text-[var(--color-foreground)] tabular-nums leading-none">
                  #{rank}
                </span>
              </div>
            </div>
          </div>

          {/* 区切り */}
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent mb-4" />

          {/* 統計 3列 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                <span className="text-[10px] text-[var(--color-muted-foreground)] font-medium">勝率</span>
              </div>
              <p className="text-xl font-black tabular-nums text-[var(--color-foreground)]">
                {winRate}<span className="text-xs font-normal text-[var(--color-muted-foreground)]">%</span>
              </p>
            </div>

            <div className="text-center border-x border-[var(--color-border)]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                <span className="text-[10px] text-[var(--color-muted-foreground)] font-medium">戦績</span>
              </div>
              <p className="text-sm font-black">
                <span className="text-[var(--color-win)]">{wins}勝</span>
                <span className="text-[var(--color-muted-foreground)] mx-0.5">/</span>
                <span className="text-[var(--color-loss)]">{losses}敗</span>
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                <span className="text-[10px] text-[var(--color-muted-foreground)] font-medium">連続</span>
              </div>
              <p className={`text-sm font-black ${streakPositive ? 'text-[var(--color-win)]' : currentStreak < 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-muted-foreground)]'}`}>
                {streakLabel}
              </p>
            </div>
          </div>

          {/* 仮レート進捗 */}
          {isProvisional && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-[var(--color-muted-foreground)] mb-1.5">
                <span>確定レートまで</span>
                <span className="text-[var(--color-provisional)] font-semibold">あと {10 - approvedMatchCount} 試合</span>
              </div>
              <div className="h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-provisional)] to-[var(--color-win)] transition-all"
                  style={{ width: `${(approvedMatchCount / 10) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </FadeInScale>
  );
}
