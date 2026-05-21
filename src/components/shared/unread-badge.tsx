'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function UnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const supabase = createClient();
      const { count: n } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (mounted) setCount(n ?? 0);
    }

    load();
    return () => { mounted = false; };
  }, []);

  if (count <= 0) return null;

  return (
    <span className="absolute -top-1 -right-1.5 min-w-[1rem] h-4 px-0.5 bg-[var(--color-loss)] text-white rounded-full text-[9px] font-bold flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  );
}
