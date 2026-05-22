import Link from 'next/link';
import { cn } from '@/lib/utils';
import { RARITY_CONFIG } from './badge-rarity-pill';
import type { BadgeDefinition, BadgeRarity } from '@/types/database';

export type UnlockedBadge = BadgeDefinition & { unlocked_at: string };

const RARITY_GLOW_MINI: Record<BadgeRarity, string> = {
  common:    'border-slate-600/40',
  uncommon:  'border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]',
  rare:      'border-purple-500/50 shadow-[0_0_8px_rgba(139,92,246,0.35)]',
  epic:      'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
  legendary: 'border-yellow-400/60 shadow-[0_0_12px_rgba(234,179,8,0.5)]',
};

interface PlayerBadgePreviewProps {
  badges: UnlockedBadge[];
  showSeeAll?: boolean;
  maxCount?: number;
}

export function PlayerBadgePreview({
  badges,
  showSeeAll = true,
  maxCount = 6,
}: PlayerBadgePreviewProps) {
  const displayed = badges.slice(0, maxCount);

  if (displayed.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <p className="text-xs text-center text-[var(--color-muted-foreground)]">
          まだバッジを取得していません
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {displayed.map(badge => (
          <div
            key={badge.id}
            className={cn(
              'rounded-xl border bg-[var(--color-card)] p-2.5 flex flex-col items-center gap-1.5 text-center',
              RARITY_GLOW_MINI[badge.rarity],
            )}
          >
            <span className="text-2xl leading-none">{badge.icon ?? '🎖️'}</span>
            <p className="text-[10px] font-semibold text-[var(--color-foreground)] leading-tight line-clamp-2">
              {badge.name}
            </p>
            <span
              className={cn(
                'text-[8px] font-bold px-1 py-0.5 rounded-full',
                RARITY_CONFIG[badge.rarity].className,
              )}
            >
              {RARITY_CONFIG[badge.rarity].label}
            </span>
          </div>
        ))}
      </div>

      {showSeeAll && (
        <Link
          href="/badges"
          className="block text-center text-xs text-[var(--color-primary)] hover:underline py-1"
        >
          すべて見る →
        </Link>
      )}
    </div>
  );
}
