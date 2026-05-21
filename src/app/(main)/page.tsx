import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser, getUserProfile, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import { RatingCard } from '@/components/home/rating-card';
import { PendingApprovals } from '@/components/home/pending-approvals';
import { RecentMatches } from '@/components/home/recent-matches';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export default async function HomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const [profile, memberData] = await Promise.all([
    getUserProfile(user.id),
    getActiveGroupMember(user.id),
  ]);

  if (!profile || !memberData) redirect('/onboarding');

  const groupId = memberData.group_id;
  const supabase = await createClient();

  const [
    { data: playerRating },
    { data: pendingMatchesRaw },
    { data: recentMatches },
  ] = await Promise.all([
    supabase.from('player_ratings').select('*').eq('group_id', groupId).eq('user_id', user.id).single(),
    supabase.from('matches')
      .select('*')
      .eq('group_id', groupId).eq('status', 'pending')
      .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('rating_histories')
      .select('*, matches(match_format, player_a_sets, player_b_sets, status)')
      .eq('group_id', groupId).eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(5),
  ]);

  // 全 user_id をまとめて1回の profiles クエリに
  const allProfileIds = [...new Set([
    ...(recentMatches ?? []).map(m => m.opponent_id as string),
    ...(pendingMatchesRaw ?? []).map(m => m.player_a_id as string),
    ...(pendingMatchesRaw ?? []).map(m => m.player_b_id as string),
  ])];

  const [
    { count: rankCount },
    { data: allProfiles },
  ] = await Promise.all([
    supabase.from('player_ratings')
      .select('user_id', { count: 'exact', head: true })
      .eq('group_id', groupId).gt('rating', playerRating?.rating ?? 0),
    allProfileIds.length > 0
      ? supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', allProfileIds)
      : Promise.resolve({ data: [] as { user_id: string; nickname: string; avatar_url: string | null }[] }),
  ]);

  const rank = (rankCount ?? 0) + 1;
  const profileMap = new Map(allProfiles?.map(p => [p.user_id, p]) ?? []);
  const opponentMap = profileMap;

  const pendingMatches = (pendingMatchesRaw ?? []).map(m => ({
    ...m,
    'profiles!matches_player_a_id_fkey': profileMap.get(m.player_a_id) ?? null,
    'profiles!matches_player_b_id_fkey': profileMap.get(m.player_b_id) ?? null,
  }));

  return (
    <div className="px-4 pt-6 space-y-5 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/groups"
            className="inline-flex items-center gap-1 group mb-0.5"
          >
            <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest font-medium group-hover:text-[var(--color-primary)] transition-colors">
              {(memberData.groups as unknown as { name: string })?.name}
            </p>
            <ChevronDown className="h-2.5 w-2.5 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] transition-colors" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight">{profile.nickname}</h1>
        </div>
      </div>

      {/* レートカード */}
      <RatingCard
        rating={playerRating?.rating ?? 0}
        rank={rank}
        wins={playerRating?.wins ?? 0}
        losses={playerRating?.losses ?? 0}
        isProvisional={playerRating?.is_provisional ?? true}
        currentStreak={playerRating?.current_streak ?? 0}
        approvedMatchCount={playerRating?.approved_match_count ?? 0}
      />

      {/* 承認待ち */}
      {pendingMatches && pendingMatches.length > 0 && (
        <PendingApprovals matches={pendingMatches} userId={user.id} />
      )}

      {/* 最近の試合 */}
      <RecentMatches histories={recentMatches ?? []} opponentMap={opponentMap} />
    </div>
  );
}
