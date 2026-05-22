import { Lock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { BadgeDefinition, BadgeRarity } from '@/types/database';

const RARITY_BG: Record<BadgeRarity, string> = {
  common:    'bg-slate-800',
  uncommon:  'bg-blue-950/80',
  rare:      'bg-purple-950/80',
  epic:      'bg-amber-950/80',
  legendary: 'bg-yellow-950/80',
};

interface BadgeStripProps {
  badges: BadgeDefinition[];
  unlockedBadgeIds: string[];
}

export function BadgeStrip({ badges, unlockedBadgeIds }: BadgeStripProps) {
  const unlockedSet = new Set(unlockedBadgeIds);
  const activeBadges = badges.filter(b => b.is_active);
  if (activeBadges.length === 0) return null;

  return (
    <div className="mt-4 pt-3.5 border-t border-[var(--color-border)]/50">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
          BADGES
        </p>
        <Link href="/badges" className="text-[10px] text-[var(--color-primary)] hover:underline">
          すべて見る →
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {activeBadges.map(badge => {
          const isUnlocked = unlockedSet.has(badge.id);
          return (
            <div
              key={badge.id}
              className={cn(
                'relative shrink-0 flex flex-col items-center gap-1 w-14',
                !isUnlocked && 'opacity-40',
              )}
            >
              <div
                className={cn(
                  'relative w-10 h-10 rounded-xl flex items-center justify-center text-[22px]',
                  isUnlocked ? RARITY_BG[badge.rarity] : 'bg-slate-800/60 grayscale',
                )}
              >
                {badge.icon ?? '🎖️'}
                {!isUnlocked && (
                  <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-slate-500 bg-[var(--color-card)] rounded-full p-[1px] box-content" />
                )}
              </div>
              <p
                className={cn(
                  'text-[8px] leading-tight text-center line-clamp-2 w-full px-0.5',
                  isUnlocked
                    ? 'text-[var(--color-foreground)]'
                    : 'text-[var(--color-muted-foreground)]',
                )}
              >
                {isUnlocked ? badge.name : badge.unlock_condition}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
