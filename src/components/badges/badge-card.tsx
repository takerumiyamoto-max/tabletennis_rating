import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { BadgeRarityPill } from './badge-rarity-pill';
import type { BadgeDefinition, BadgeRarity } from '@/types/database';

const RARITY_GLOW: Record<BadgeRarity, string> = {
  common:    '',
  uncommon:  'shadow-[0_0_12px_rgba(59,130,246,0.25)] border-blue-500/30',
  rare:      'shadow-[0_0_14px_rgba(139,92,246,0.3)] border-purple-500/35',
  epic:      'shadow-[0_0_18px_rgba(245,158,11,0.35)] border-amber-500/40',
  legendary: 'shadow-[0_0_22px_rgba(234,179,8,0.45)] border-yellow-400/50',
};

const RARITY_ICON_BG: Record<BadgeRarity, string> = {
  common:    'bg-slate-800',
  uncommon:  'bg-blue-950/80',
  rare:      'bg-purple-950/80',
  epic:      'bg-amber-950/80',
  legendary: 'bg-yellow-950/80',
};

interface BadgeCardProps {
  badge: BadgeDefinition;
  unlockedAt: string | null;
}

export function BadgeCard({ badge, unlockedAt }: BadgeCardProps) {
  const isUnlocked = unlockedAt !== null;
  const isComingSoon = !badge.is_active;

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-3 flex flex-col gap-2 transition-all',
        'bg-[var(--color-card)] border-[var(--color-border)]',
        isUnlocked && RARITY_GLOW[badge.rarity],
        !isUnlocked && 'opacity-50',
        isComingSoon && 'opacity-40',
      )}
    >
      {/* アイコン */}
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'relative shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-2xl',
            isUnlocked ? RARITY_ICON_BG[badge.rarity] : 'bg-slate-800/60',
            !isUnlocked && 'grayscale',
          )}
        >
          <span className={cn(!isUnlocked && 'opacity-50')}>{badge.icon ?? '🎖️'}</span>
          {!isUnlocked && !isComingSoon && (
            <Lock className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-slate-400 bg-[var(--color-card)] rounded-full p-0.5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-bold leading-tight truncate',
            isUnlocked ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]',
          )}>
            {badge.name}
          </p>
          <BadgeRarityPill rarity={badge.rarity} size="sm" className="mt-1" />
        </div>
      </div>

      {/* 説明 */}
      <p className="text-[10px] text-[var(--color-muted-foreground)] leading-snug">
        {isUnlocked ? badge.description : badge.unlock_condition}
      </p>

      {/* フッター */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-[var(--color-border)]/50">
        {badge.title_reward ? (
          <span className="text-[9px] text-[var(--color-primary)] font-semibold truncate">
            称号：{badge.title_reward}
          </span>
        ) : <span />}

        {isComingSoon ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] font-medium">
            近日公開
          </span>
        ) : isUnlocked ? (
          <span className="text-[9px] text-[var(--color-muted-foreground)] tabular-nums shrink-0">
            {formatDate(unlockedAt)}
          </span>
        ) : (
          <span className="text-[9px] text-[var(--color-muted-foreground)]">未取得</span>
        )}
      </div>
    </div>
  );
}
