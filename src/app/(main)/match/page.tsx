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

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profiles(nickname, avatar_url)')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .neq('user_id', user.id);

  const opponents = members?.map(m => ({
    user_id: m.user_id,
    nickname: (m.profiles as unknown as { nickname: string; avatar_url: string | null } | null)?.nickname ?? '?',
    avatar_url: (m.profiles as unknown as { nickname: string; avatar_url: string | null } | null)?.avatar_url ?? null,
  })) ?? [];

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">試合入力</h1>
      <MatchForm groupId={groupId} userId={user.id} opponents={opponents} />
    </div>
  );
}
