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

  // メンバー一覧（3クエリ並列: group_members / profiles / player_ratings）
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('id, group_id, user_id, role, status, joined_at, created_at')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  const memberUserIds = memberRows?.map(m => m.user_id) ?? [];

  const [{ data: profileRows }, { data: ratingRows }, { data: pendingMatchRows }] = await Promise.all([
    memberUserIds.length > 0
      ? supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', memberUserIds)
      : Promise.resolve({ data: [] as { user_id: string; nickname: string; avatar_url: string | null }[] }),
    memberUserIds.length > 0
      ? supabase.from('player_ratings')
          .select('user_id, rating, wins, losses, approved_match_count, is_provisional')
          .eq('group_id', groupId).in('user_id', memberUserIds)
      : Promise.resolve({ data: [] as { user_id: string; rating: number; wins: number; losses: number; approved_match_count: number; is_provisional: boolean }[] }),
    supabase.from('matches').select('*')
      .eq('group_id', groupId).eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  const profileMap = new Map(profileRows?.map(p => [p.user_id, p]) ?? []);
  const ratingMap  = new Map(ratingRows?.map(r => [r.user_id, r]) ?? []);

  const members = (memberRows ?? []).map(m => ({
    ...m,
    profiles:       profileMap.get(m.user_id) ?? null,
    player_ratings: ratingMap.get(m.user_id)  ?? null,
  }));

  // pending 試合のプロフィール（別途取得）
  const pendingPlayerIds = [...new Set([
    ...(pendingMatchRows ?? []).map(m => m.player_a_id as string),
    ...(pendingMatchRows ?? []).map(m => m.player_b_id as string),
  ])];
  const { data: pendingProfileRows } = pendingPlayerIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname').in('user_id', pendingPlayerIds)
    : { data: [] as { user_id: string; nickname: string }[] };
  const pendingProfileMap = new Map(pendingProfileRows?.map(p => [p.user_id, p]) ?? []);

  const pendingMatches = (pendingMatchRows ?? []).map(m => ({
    ...m,
    'profiles!matches_player_a_id_fkey': pendingProfileMap.get(m.player_a_id) ?? null,
    'profiles!matches_player_b_id_fkey': pendingProfileMap.get(m.player_b_id) ?? null,
  }));

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
