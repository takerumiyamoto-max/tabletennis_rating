import { Card } from '@/components/ui/card';
import { Flame, Zap, TrendingUp, TrendingDown, Star, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonalBests } from '@/types/app';

interface PersonalBestsCardProps {
  bests: PersonalBests;
}

export function PersonalBestsCard({ bests }: PersonalBestsCardProps) {
  const weeklyPositive = bests.weeklyRatingChange >= 0;

  return (
    <div>
      <h2 className="font-semibold text-sm mb-3">自己ベスト</h2>

      <div className="grid grid-cols-2 gap-2">
        {/* 最高レート */}
        <Card className="p-3 gradient-gold border-[var(--color-gold)]/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Star className="h-3.5 w-3.5 text-[var(--color-gold)]" />
            <p className="text-[10px] text-[var(--color-muted-foreground)]">最高レート</p>
          </div>
          <p className="text-2xl font-black text-[var(--color-gold)] tabular-nums leading-none">
            {Math.round(bests.highestRating)}
          </p>
        </Card>

        {/* 最低レート */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <p className="text-[10px] text-[var(--color-muted-foreground)]">最低レート</p>
          </div>
          <p className="text-2xl font-black text-[var(--color-muted-foreground)] tabular-nums leading-none">
            {Math.round(bests.lowestRating)}
          </p>
        </Card>

        {/* 1試合最大上昇 */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="h-3.5 w-3.5 text-[var(--color-win)]" />
            <p className="text-[10px] text-[var(--color-muted-foreground)]">1試合最大上昇</p>
          </div>
          <p className="text-2xl font-black text-[var(--color-win)] tabular-nums leading-none">
            +{Math.round(bests.maxSingleMatchGain)}
          </p>
        </Card>

        {/* 今週の変動 */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {weeklyPositive
              ? <TrendingUp className="h-3.5 w-3.5 text-[var(--color-win)]" />
              : <TrendingDown className="h-3.5 w-3.5 text-[var(--color-loss)]" />}
            <p className="text-[10px] text-[var(--color-muted-foreground)]">今週の変動</p>
          </div>
          <p className={cn(
            'text-2xl font-black tabular-nums leading-none',
            weeklyPositive ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]',
          )}>
            {weeklyPositive ? '+' : ''}{Math.round(bests.weeklyRatingChange)}
          </p>
        </Card>

        {/* 格上撃破数 */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="h-3.5 w-3.5 text-[var(--color-gold)]" />
            <p className="text-[10px] text-[var(--color-muted-foreground)]">格上撃破</p>
          </div>
          <p className="text-2xl font-black text-[var(--color-gold)] tabular-nums leading-none">
            {bests.giantKillingCount}
            <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-0.5">回</span>
          </p>
        </Card>

        {/* 通算勝利 */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <p className="text-[10px] text-[var(--color-muted-foreground)]">通算勝利</p>
          </div>
          <p className="text-2xl font-black tabular-nums leading-none">
            <span className="text-[var(--color-win)]">{bests.wins}</span>
            <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-0.5">/ {bests.totalMatches}試合</span>
          </p>
        </Card>
      </div>
    </div>
  );
}
