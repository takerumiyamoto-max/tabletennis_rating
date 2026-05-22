import { cn } from '@/lib/utils';
import type { BadgeRarity } from '@/types/database';

const RARITY_CONFIG: Record<BadgeRarity, { label: string; className: string }> = {
  common:    { label: 'COMMON',    className: 'bg-slate-700/60 text-slate-300 border border-slate-600/40' },
  uncommon:  { label: 'UNCOMMON',  className: 'bg-blue-900/50 text-blue-300 border border-blue-500/40' },
  rare:      { label: 'RARE',      className: 'bg-purple-900/50 text-purple-300 border border-purple-500/40' },
  epic:      { label: 'EPIC',      className: 'bg-amber-900/50 text-amber-300 border border-amber-500/40' },
  legendary: { label: 'LEGENDARY', className: 'bg-yellow-900/50 text-yellow-300 border border-yellow-400/50' },
};

interface BadgeRarityPillProps {
  rarity: BadgeRarity;
  size?: 'sm' | 'md';
  className?: string;
}

export function BadgeRarityPill({ rarity, size = 'md', className }: BadgeRarityPillProps) {
  const config = RARITY_CONFIG[rarity];
  return (
    <span
      className={cn(
        'rounded-full font-bold tracking-wider',
        size === 'sm' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

export { RARITY_CONFIG };
