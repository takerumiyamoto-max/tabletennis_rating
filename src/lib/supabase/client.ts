'use client';

import { createBrowserClient } from '@supabase/ssr';

// Database ジェネリクスを外し、クエリ結果は各ページで明示的に型アサーション
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
