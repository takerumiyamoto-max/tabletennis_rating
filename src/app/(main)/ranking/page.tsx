import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RankingList } from '@/components/ranking/ranking-list';
import type { RankingEntry } from '@/types/app';

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberData } = await supabase
    .from('group_members')
    .select('group_id, groups(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  if (!memberData) redirect('/onboarding');

  const groupId = memberData.group_id;
  const groupName = (memberData.groups as unknown as { name: string })?.name ?? '';

  // レーティング一覧 (降順)
  const { data: ratings } = await supabase
    .from('player_ratings')
    .select('*')
    .eq('group_id', groupId)
    .order('rating', { ascending: false });

  if (!ratings) return null;

  // プロフィール一覧
  const userIds = ratings.map(r => r.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, nickname, avatar_url')
    .in('user_id', userIds);

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);

  const entries: RankingEntry[] = ratings.map((r, i) => {
    const profile = profileMap.get(r.user_id);
    return {
      rank: i + 1,
      user_id: r.user_id,
      nickname: profile?.nickname ?? '?',
      avatar_url: profile?.avatar_url ?? null,
      rating: Number(r.rating),
      rating_display: Math.round(Number(r.rating)),
      initial_rating: r.initial_rating,
      wins: r.wins,
      losses: r.losses,
      approved_match_count: r.approved_match_count,
      is_provisional: r.is_provisional,
      current_streak: r.current_streak,
      highest_rating: Number(r.highest_rating),
      rating_change_today: null,
    };
  });

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="mb-5">
        <p className="text-[var(--color-muted-foreground)] text-sm">{groupName}</p>
        <h1 className="text-xl font-bold">ランキング</h1>
      </div>
      <RankingList entries={entries} currentUserId={user.id} />
    </div>
  );
}
