import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberData } = await supabase
    .from('group_members')
    .select('group_id, role, groups(name, slug, description)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  if (!memberData) redirect('/');
  const groupId = memberData.group_id;

  // メンバー一覧
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('*, player_ratings(rating, wins, losses, approved_match_count, is_provisional)')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('created_at');

  const memberUserIds = memberRows?.map(m => m.user_id) ?? [];
  const { data: profileRows } = memberUserIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', memberUserIds)
    : { data: [] as { user_id: string; nickname: string; avatar_url: string | null }[] };
  const profileMap = new Map(profileRows?.map(p => [p.user_id, p]) ?? []);

  const members = (memberRows ?? []).map(m => ({
    ...m,
    profiles: profileMap.get(m.user_id) ?? null,
    player_ratings: Array.isArray(m.player_ratings) ? m.player_ratings[0] ?? null : m.player_ratings ?? null,
  }));

  // pending 試合
  const { data: pendingMatches } = await supabase
    .from('matches')
    .select('*, profiles!matches_player_a_id_fkey(nickname), profiles!matches_player_b_id_fkey(nickname)')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // レート設定
  const { data: ratingSettings } = await supabase
    .from('group_rating_settings')
    .select('*')
    .eq('group_id', groupId)
    .single();

  // 初期レートラベル
  const { data: labels } = await supabase
    .from('initial_rating_labels')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order');

  return (
    <AdminDashboard
      groupId={groupId}
      group={(memberData.groups as unknown as { name: string; slug: string; description: string | null })}
      myRole={memberData.role}
      members={members ?? []}
      pendingMatches={pendingMatches ?? []}
      ratingSettings={ratingSettings}
      labels={labels ?? []}
      currentUserId={user.id}
    />
  );
}
