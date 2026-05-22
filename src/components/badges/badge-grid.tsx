import { BadgeCard } from './badge-card';
import type { BadgeCategory, BadgeDefinition } from '@/types/database';

const CATEGORY_LABELS: Record<BadgeCategory | 'aggregate', string> = {
  trial:     '試合経験',
  victory:   '勝利',
  streak:    '連勝',
  rating:    'レート',
  quality:   '試合品質',
  aggregate: '記録・集計',
  season:    'シーズン',
};

const CATEGORY_ORDER: BadgeCategory[] = ['trial', 'victory', 'streak', 'rating', 'quality'];

interface BadgeGridProps {
  badges: BadgeDefinition[];
  unlockedMap: Map<string, string>;
}

export function BadgeGrid({ badges, unlockedMap }: BadgeGridProps) {
  const activeBadges  = badges.filter(b => b.is_active);
  const comingSoon    = badges.filter(b => !b.is_active);

  const grouped = new Map<BadgeCategory, BadgeDefinition[]>();
  for (const b of activeBadges) {
    const list = grouped.get(b.category) ?? [];
    list.push(b);
    grouped.set(b.category, list);
  }

  const unlockedCount = activeBadges.filter(b => unlockedMap.has(b.id)).length;

  return (
    <div className="space-y-8">
      {/* 取得進捗 */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">取得バッジ</p>
          <p className="text-sm font-black tabular-nums">
            <span className="text-[var(--color-primary)]">{unlockedCount}</span>
            <span className="text-[var(--color-muted-foreground)] font-normal text-xs"> / {activeBadges.length}</span>
          </p>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${activeBadges.length > 0 ? (unlockedCount / activeBadges.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* カテゴリ別 */}
      {CATEGORY_ORDER.map(cat => {
        const list = grouped.get(cat);
        if (!list || list.length === 0) return null;
        const catUnlocked = list.filter(b => unlockedMap.has(b.id)).length;

        return (
          <section key={cat} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--color-foreground)]">
                {CATEGORY_LABELS[cat]}
              </h2>
              <span className="text-[10px] text-[var(--color-muted-foreground)] tabular-nums">
                {catUnlocked} / {list.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {list.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlockedAt={unlockedMap.get(badge.id) ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Phase B: 近日公開 */}
      {comingSoon.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--color-muted-foreground)]">
              {CATEGORY_LABELS['aggregate']}
            </h2>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] font-medium">
              近日公開
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {comingSoon.map(badge => (
              <BadgeCard key={badge.id} badge={badge} unlockedAt={null} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
