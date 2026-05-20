'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sword, Trophy, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  unreadCount?: number;
}

const navItems = [
  { href: '/',        label: 'ホーム',     icon: Home,    badge: true  },
  { href: '/match',   label: '試合入力',   icon: Sword,   badge: false },
  { href: '/ranking', label: 'ランキング', icon: Trophy,  badge: false },
  { href: '/history', label: '履歴',       icon: History, badge: false },
  { href: '/profile', label: 'マイページ', icon: User,    badge: false },
] as const;

export function BottomNav({ unreadCount = 0 }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          const count  = badge ? unreadCount : 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 text-xs font-medium transition-all duration-200',
                active
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-all duration-200',
                    active && 'drop-shadow-[0_0_6px_rgba(0,200,255,0.8)]'
                  )}
                />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[1rem] h-4 px-0.5 bg-[var(--color-loss)] text-white rounded-full text-[9px] font-bold flex items-center justify-center leading-none">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className={cn('transition-all duration-200', active && 'neon-text text-xs')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
