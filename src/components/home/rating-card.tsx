import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award, Target, Zap } from 'lucide-react';

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

  return (
    <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-gradient-to-br from-[var(--color-card)] to-[var(--color-secondary)] p-5 neon-glow relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 bg-[var(--color-primary)]/5 rounded-2xl" />
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--color-primary)]/5 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[var(--color-muted-foreground)] text-xs font-medium uppercase tracking-widest">レーティング</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-5xl font-black neon-text tabular-nums">{displayRating}</span>
              {isProvisional && (
                <Badge variant="provisional" className="mb-1 text-xs">仮レート</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[var(--color-muted-foreground)] text-xs font-medium uppercase tracking-widest">順位</p>
            <div className="flex items-center gap-1 mt-1">
              <Award className="h-4 w-4 text-[var(--color-provisional)]" />
              <span className="text-2xl font-bold text-[var(--color-foreground)]">#{rank}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--color-muted-foreground)]">勝率</span>
            </div>
            <p className="text-lg font-bold mt-0.5">{winRate}<span className="text-xs font-normal text-[var(--color-muted-foreground)]">%</span></p>
          </div>
          <div className="text-center border-x border-[var(--color-border)]">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--color-muted-foreground)]">戦績</span>
            </div>
            <p className="text-sm font-bold mt-0.5">
              <span className="text-[var(--color-win)]">{wins}勝</span>
              <span className="text-[var(--color-muted-foreground)] mx-0.5">/</span>
              <span className="text-[var(--color-loss)]">{losses}敗</span>
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Zap className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--color-muted-foreground)]">連続</span>
            </div>
            <p className="text-lg font-bold mt-0.5">
              <span className={currentStreak > 0 ? 'text-[var(--color-win)]' : currentStreak < 0 ? 'text-[var(--color-loss)]' : ''}>
                {currentStreak > 0 ? `${currentStreak}連勝` : currentStreak < 0 ? `${Math.abs(currentStreak)}連敗` : '-'}
              </span>
            </p>
          </div>
        </div>

        {isProvisional && (
          <p className="text-xs text-[var(--color-provisional)] mt-3 text-center">
            あと {10 - approvedMatchCount} 試合で確定レートになります
          </p>
        )}
      </div>
    </div>
  );
}
