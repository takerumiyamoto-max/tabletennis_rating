import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import { MatchForm } from '@/components/match/match-form';

export default async function MatchPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const memberData = await getActiveGroupMember(user.id);
  if (!memberData) redirect('/onboarding');

  const groupId = memberData.group_id;
  const supabase = await createClient();

  const { data: memberRows } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .neq('user_id', user.id);

  const memberUserIds = memberRows?.map(m => m.user_id) ?? [];

  const { data: memberProfiles } = memberUserIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', memberUserIds)
    : { data: [] as { user_id: string; nickname: string; avatar_url: string | null }[] };

  const opponents = memberProfiles?.map(p => ({
    user_id: p.user_id,
    nickname: p.nickname,
    avatar_url: p.avatar_url,
  })) ?? [];

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">試合入力</h1>
      <MatchForm groupId={groupId} userId={user.id} opponents={opponents} />
    </div>
  );
}
