import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

  const stats = [
    { icon: TrendingUp, label: 'レーティング', value: Math.round(rating).toString(), sub: isProvisional ? '仮' : '確定', color: 'text-[var(--color-primary)]' },
    { icon: Award,      label: '順位',       value: `#${rank}`, sub: `/ ${totalMembers}人`, color: 'text-yellow-400' },
    { icon: Target,     label: '試合数',     value: approvedMatchCount.toString(), sub: `${wins}勝 ${losses}敗`, color: 'text-[var(--color-muted-foreground)]' },
    { icon: Trophy,     label: '勝率',       value: `${winRate}%`, sub: `${wins}W ${losses}L`, color: winRate >= 50 ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]' },
    { icon: Star,       label: '最高レート', value: Math.round(highestRating).toString(), sub: '', color: 'text-[var(--color-provisional)]' },
    { icon: Zap,        label: '連続記録',   value: streakLabel, sub: '', color: currentStreak > 0 ? 'text-[var(--color-win)]' : currentStreak < 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-muted-foreground)]' },
  ];

  return (
    <div>
      <h2 className="font-semibold text-sm mb-3">統計</h2>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ icon: Icon, label, value, sub, color }) => (
          <Card key={label} className="p-3">
            <div className="flex flex-col items-center text-center gap-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <p className="text-[10px] text-[var(--color-muted-foreground)] leading-none">{label}</p>
              <p className={`text-base font-black leading-none ${color}`}>{value}</p>
              {sub && <p className="text-[10px] text-[var(--color-muted-foreground)]">{sub}</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
