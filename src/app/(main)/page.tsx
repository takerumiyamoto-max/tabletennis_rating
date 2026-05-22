import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser, getUserProfile, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import { RatingCard } from '@/components/home/rating-card';
import { PendingApprovals } from '@/components/home/pending-approvals';
import { RecentMatches } from '@/components/home/recent-matches';
import { MatchFeed } from '@/components/home/match-feed';
import Link from 'next/link';
import { ChevronDown, Swords, Users } from 'lucide-react';
import { buildFeedEntries } from '@/lib/gamification/highlights';
import type { RatingHistory } from '@/types/database';

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
    { data: feedMatchesRaw },
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
    supabase.from('matches')
      .select('id, approved_at, created_at, match_format, player_a_id, player_b_id, winner_id, player_a_sets, player_b_sets')
      .eq('group_id', groupId).eq('status', 'approved')
      .order('approved_at', { ascending: false }).limit(10),
  ]);

  const feedMatchIds = (feedMatchesRaw ?? []).map(m => m.id);

  // Unified profiles query covering all player IDs
  const allProfileIds = [...new Set([
    ...(recentMatches ?? []).map(m => m.opponent_id as string),
    ...(pendingMatchesRaw ?? []).map(m => m.player_a_id as string),
    ...(pendingMatchesRaw ?? []).map(m => m.player_b_id as string),
    ...(feedMatchesRaw ?? []).map(m => m.player_a_id),
    ...(feedMatchesRaw ?? []).map(m => m.player_b_id),
  ])];

  const [
    { count: rankCount },
    { data: allProfiles },
    { data: feedHistoriesRaw },
  ] = await Promise.all([
    supabase.from('player_ratings')
      .select('user_id', { count: 'exact', head: true })
      .eq('group_id', groupId).gt('rating', playerRating?.rating ?? 0),
    allProfileIds.length > 0
      ? supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', allProfileIds)
      : Promise.resolve({ data: [] as { user_id: string; nickname: string; avatar_url: string | null }[] }),
    feedMatchIds.length > 0
      ? supabase.from('rating_histories')
          .select('id, match_id, user_id, opponent_id, rating_before, rating_after, rating_change, result, created_at, group_id')
          .in('match_id', feedMatchIds)
      : Promise.resolve({ data: [] as RatingHistory[] }),
  ]);

  const rank       = (rankCount ?? 0) + 1;
  const profileMap = new Map(allProfiles?.map(p => [p.user_id, p]) ?? []);

  const pendingMatches = (pendingMatchesRaw ?? []).map(m => ({
    ...m,
    'profiles!matches_player_a_id_fkey': profileMap.get(m.player_a_id) ?? null,
    'profiles!matches_player_b_id_fkey': profileMap.get(m.player_b_id) ?? null,
  }));

  const feedEntries = buildFeedEntries(
    feedMatchesRaw ?? [],
    (feedHistoriesRaw ?? []) as RatingHistory[],
    profileMap,
  );

  return (
    <div className="px-4 pt-6 space-y-5 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/groups" className="inline-flex items-center gap-1 group mb-0.5">
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
      <RecentMatches histories={recentMatches ?? []} opponentMap={profileMap} />

      {/* みんなの試合フィード */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <h2 className="font-semibold text-sm">みんなの試合</h2>
          <Link href="/history" className="text-xs text-[var(--color-primary)] ml-auto hover:underline">
            すべて見る
          </Link>
        </div>
        <MatchFeed entries={feedEntries} />
      </div>

      {/* 試合入力 CTA */}
      <Link
        href="/match"
        className="flex items-center justify-center gap-2 p-4 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-neon-dim)] hover:bg-[var(--color-primary)]/10 transition-all"
      >
        <Swords className="h-4 w-4 text-[var(--color-primary)]" />
        <span className="text-sm font-semibold text-[var(--color-primary)]">試合を記録する</span>
      </Link>
    </div>
  );
}
