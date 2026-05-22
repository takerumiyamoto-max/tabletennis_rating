import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import { BadgeGrid } from '@/components/badges/badge-grid';
import type { BadgeDefinition } from '@/types/database';

export default async function BadgesPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const memberData = await getActiveGroupMember(user.id);
  if (!memberData) redirect('/onboarding');

  const groupId = memberData.group_id;
  const supabase = await createClient();

  const [{ data: badgesRaw, error }, { data: myBadgeRows }] = await Promise.all([
    supabase.from('badge_definitions').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('player_badges')
      .select('badge_id, unlocked_at')
      .eq('group_id', groupId)
      .eq('user_id', user.id),
  ]);

  if (error) {
    return (
      <div className="px-4 pt-6 pb-24 max-w-lg mx-auto">
        <h1 className="text-xl font-black mb-6">バッジ</h1>
        <p className="text-sm text-center text-[var(--color-muted-foreground)] py-12">
          バッジの読み込みに失敗しました
        </p>
      </div>
    );
  }

  const badges = (badgesRaw ?? []) as BadgeDefinition[];

  const unlockedMap = new Map<string, string>(
    (myBadgeRows ?? []).map(r => [r.badge_id, r.unlocked_at])
  );

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto">
      <h1 className="text-xl font-black mb-6">バッジ</h1>

      {badges.length === 0 ? (
        <p className="text-sm text-center text-[var(--color-muted-foreground)] py-12">
          バッジが登録されていません
        </p>
      ) : (
        <BadgeGrid badges={badges} unlockedMap={unlockedMap} />
      )}
    </div>
  );
}
