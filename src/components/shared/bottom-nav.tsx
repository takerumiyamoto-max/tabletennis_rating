'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sword, Trophy, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { UnreadBadge } from '@/components/shared/unread-badge';

const navItems = [
  { href: '/',        label: 'ホーム',     icon: Home,    badge: true  },
  { href: '/match',   label: '試合入力',   icon: Sword,   badge: false },
  { href: '/ranking', label: 'ランキング', icon: Trophy,  badge: false },
  { href: '/history', label: '履歴',       icon: History, badge: false },
  { href: '/profile', label: 'マイページ', icon: User,    badge: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active  = pathname === href || (href !== '/' && pathname.startsWith(href));
          const pending = pendingHref === href && !active;

          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (!active) setPendingHref(href);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 text-xs font-medium transition-all duration-200 relative',
                active
                  ? 'text-[var(--color-primary)]'
                  : pending
                  ? 'text-[var(--color-primary)]/60'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              )}
            >
              {active && (
                <span className="absolute inset-x-1.5 inset-y-1 rounded-xl bg-[var(--color-neon-dim)] pointer-events-none" />
              )}
              {pending && (
                <span className="absolute inset-x-1.5 inset-y-1 rounded-xl bg-[var(--color-neon-dim)]/40 pointer-events-none animate-pulse" />
              )}

              <div className="relative z-10">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-all duration-200',
                    active && 'drop-shadow-[0_0_6px_rgba(0,200,255,0.8)]',
                    pending && 'opacity-70'
                  )}
                />
                {badge && <UnreadBadge />}
              </div>

              <span className={cn(
                'relative z-10 transition-all duration-200 text-[10px]',
                active && 'neon-text font-semibold',
                pending && 'opacity-70'
              )}>
                {label}
              </span>

              {/* アクティブ下線 */}
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-[var(--color-primary)] shadow-[0_0_6px_rgba(0,200,255,0.8)]" />
              )}

              {/* 遷移中ローディングドット */}
              {pending && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-primary)]/60 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
