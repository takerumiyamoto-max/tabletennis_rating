import { Card } from '@/components/ui/card';
import { Trophy, Target, TrendingUp, Award, Zap, Star } from 'lucide-react';

interface MyStatsCardProps {
  rating: number;
  rank: number;
  totalMembers: number;
  wins: number;
  losses: number;
  winRate: number;
  approvedMatchCount: number;
  currentStreak: number;
  highestRating: number;
  isProvisional: boolean;
}

export function MyStatsCard({
  rating, rank, totalMembers, wins, losses, winRate,
  approvedMatchCount, currentStreak, highestRating, isProvisional,
}: MyStatsCardProps) {
  const streakLabel = currentStreak > 0
    ? `${currentStreak}連勝`
    : currentStreak < 0
    ? `${Math.abs(currentStreak)}連敗`
    : '-';

  return (
    <div>
      <h2 className="font-semibold text-sm mb-3">統計</h2>

      {/* レーティング + 順位 (上段 2列) */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* レーティング */}
        <Card className="p-4 col-span-1 gradient-card border-[var(--color-primary)]/20">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              <p className="text-[10px] text-[var(--color-muted-foreground)] font-medium">レーティング</p>
            </div>
            <p className="text-3xl font-black neon-text tabular-nums leading-none">{Math.round(rating)}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">
              {isProvisional ? <span className="text-[var(--color-provisional)]">仮レート</span> : '確定レート'}
            </p>
          </div>
        </Card>

        {/* 順位 */}
        <Card className="p-4 col-span-1 gradient-card border-[var(--color-gold)]/20">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-[var(--color-gold)]" />
              <p className="text-[10px] text-[var(--color-muted-foreground)] font-medium">順位</p>
            </div>
            <p className="text-3xl font-black text-[var(--color-gold)] tabular-nums leading-none">#{rank}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">/ {totalMembers}人中</p>
          </div>
        </Card>
      </div>

      {/* 下段 3列 */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <div className="flex flex-col items-center text-center gap-1">
            <Target className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <p className="text-[10px] text-[var(--color-muted-foreground)]">試合数</p>
            <p className="text-lg font-black text-[var(--color-foreground)] tabular-nums">{approvedMatchCount}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">
              <span className="text-[var(--color-win)]">{wins}W</span>
              {' '}<span className="text-[var(--color-loss)]">{losses}L</span>
            </p>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex flex-col items-center text-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <p className="text-[10px] text-[var(--color-muted-foreground)]">勝率</p>
            <p className={`text-lg font-black tabular-nums ${winRate >= 50 ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}`}>
              {winRate}<span className="text-xs font-normal text-[var(--color-muted-foreground)]">%</span>
            </p>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex flex-col items-center text-center gap-1">
            <Zap className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <p className="text-[10px] text-[var(--color-muted-foreground)]">連続</p>
            <p className={`text-sm font-black ${currentStreak > 0 ? 'text-[var(--color-win)]' : currentStreak < 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-muted-foreground)]'}`}>
              {streakLabel}
            </p>
          </div>
        </Card>

        <Card className="p-3 col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-[var(--color-provisional)]" />
              <p className="text-[10px] text-[var(--color-muted-foreground)]">最高レート</p>
            </div>
            <p className="text-lg font-black text-[var(--color-provisional)] tabular-nums">{Math.round(highestRating)}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
