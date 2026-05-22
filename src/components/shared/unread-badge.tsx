'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function UnreadBadge() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { setCount(0); return; }

      // 自分が player_b で、かつ自分が submit していない pending 試合 = 承認待ち件数
      const { count: n } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .eq('player_b_id', user.id)
        .eq('status', 'pending')
        .neq('submitted_by', user.id);

      if (!cancelled) setCount(n ?? 0);
    }

    load();

    function handleRefresh() { load(); }
    window.addEventListener('notifications:refresh', handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('notifications:refresh', handleRefresh);
    };
  }, [pathname]);

  if (count <= 0) return null;

  return (
    <span className="absolute -top-1 -right-1.5 min-w-[1rem] h-4 px-0.5 bg-[var(--color-loss)] text-white rounded-full text-[9px] font-bold flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  );
}
