import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getAuthUser, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import { RatingChart } from '@/components/profile/rating-chart';
import { MyStatsCard } from '@/components/profile/my-stats-card';
import { PersonalBestsCard } from '@/components/profile/personal-bests-card';
import { HeadToHeadCard } from '@/components/profile/head-to-head-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Medal } from 'lucide-react';
import Link from 'next/link';
import { buildPersonalBests } from '@/lib/gamification/stats';
import { buildHeadToHead } from '@/lib/gamification/headToHead';
import type { RatingChartPoint } from '@/types/app';
import type { RatingHistory, Match } from '@/types/database';

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PlayerDetailPage({ params }: Props) {
  const { userId: targetUserId } = await params;

  const currentUser = await getAuthUser();
  if (!currentUser) redirect('/login');

  const memberData = await getActiveGroupMember(currentUser.id);
  if (!memberData) redirect('/onboarding');

  const groupId = memberData.group_id;
  const supabase = await createClient();

  // Verify target is in same group
  const { data: targetMember } = await supabase
    .from('group_members')
    .select('user_id, status')
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)
    .eq('status', 'active')
    .single();

  if (!targetMember) notFound();

  // If viewing own profile, redirect
  if (targetUserId === currentUser.id) redirect('/profile');

  const [
    { data: targetProfile },
    { data: targetRating },
    { data: historiesRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('user_id, nickname, avatar_url, created_at').eq('user_id', targetUserId).single(),
    supabase.from('player_ratings').select('*').eq('group_id', groupId).eq('user_id', targetUserId).single(),
    supabase.from('rating_histories').select('*').eq('group_id', groupId).eq('user_id', targetUserId)
      .order('created_at', { ascending: true }).limit(60),
  ]);

  if (!targetProfile || !targetRating) notFound();

  const histories = historiesRaw as RatingHistory[] | null;

  const [
    { count: rankCount },
    { count: totalCount },
    { data: h2hMatchesRaw },
    { data: opponentHistoriesRaw },
  ] = await Promise.all([
    supabase.from('player_ratings')
      .select('user_id', { count: 'exact', head: true })
      .eq('group_id', groupId).gt('rating', targetRating.rating ?? 0),
    supabase.from('player_ratings')
      .select('user_id', { count: 'exact', head: true })
      .eq('group_id', groupId),
    supabase.from('matches')
      .select('*').eq('group_id', groupId).eq('status', 'approved')
      .or(`player_a_id.eq.${targetUserId},player_b_id.eq.${targetUserId}`)
      .order('approved_at', { ascending: false }).limit(100),
    // Opponent histories for giant killing calculation
    histories && histories.filter(h => h.result === 'win').length > 0
      ? supabase.from('rating_histories')
          .select('match_id, user_id, rating_before')
          .in('match_id', histories.filter(h => h.result === 'win').map(h => h.match_id))
          .neq('user_id', targetUserId)
      : Promise.resolve({ data: [] as { match_id: string; user_id: string; rating_before: number }[] }),
  ]);

  const rank = (rankCount ?? 0) + 1;
  const h2hMatches = h2hMatchesRaw as Match[] ?? [];

  // Profiles for head-to-head opponents
  const opponentIds = [...new Set(h2hMatches.map(m =>
    m.player_a_id === targetUserId ? m.player_b_id : m.player_a_id
  ))];
  const [{ data: oppProfiles }, { data: oppRatings }] = await Promise.all([
    opponentIds.length > 0
      ? supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', opponentIds)
      : Promise.resolve({ data: [] as { user_id: string; nickname: string; avatar_url: string | null }[] }),
    opponentIds.length > 0
      ? supabase.from('player_ratings').select('user_id, rating').eq('group_id', groupId).in('user_id', opponentIds)
      : Promise.resolve({ data: [] as { user_id: string; rating: number }[] }),
  ]);

  const profileMap = new Map(oppProfiles?.map(p => [p.user_id, p]) ?? []);
  const ratingMap  = new Map(oppRatings?.map(r => [r.user_id, Math.round(Number(r.rating))]) ?? []);

  // Also add chart opponent names
  const chartOppIds = [...new Set((histories ?? []).map(h => h.opponent_id))];
  const { data: chartOppProfiles } = chartOppIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname').in('user_id', chartOppIds)
    : { data: [] as { user_id: string; nickname: string }[] };
  const chartOppMap = new Map(chartOppProfiles?.map(p => [p.user_id, p.nickname]) ?? []);

  // Personal bests
  const opponentHistByMatchId = new Map(
    (opponentHistoriesRaw ?? []).map(h => [h.match_id, h as unknown as RatingHistory])
  );
  const bests = buildPersonalBests(targetRating, histories ?? [], opponentHistByMatchId);

  // Head to head
  const h2hEntries = buildHeadToHead(h2hMatches, targetUserId, profileMap, ratingMap);

  // Chart points
  const chartPoints: RatingChartPoint[] = [];
  if (targetRating) {
    chartPoints.push({
      date:              targetProfile.created_at,
      rating:            targetRating.initial_rating,
      rating_display:    targetRating.initial_rating,
      match_id:          'initial',
      result:            'win',
      opponent_nickname: '開始',
    });
    (histories ?? []).forEach(h => {
      chartPoints.push({
        date:              h.created_at,
        rating:            Number(h.rating_after),
        rating_display:    Math.round(Number(h.rating_after)),
        match_id:          h.match_id,
        result:            h.result,
        opponent_nickname: chartOppMap.get(h.opponent_id) ?? '?',
      });
    });
  }

  const winRate = targetRating.wins + targetRating.losses > 0
    ? Math.round((targetRating.wins / (targetRating.wins + targetRating.losses)) * 100)
    : 0;

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      {/* Back link */}
      <Link
        href="/ranking"
        className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors"
      >
        ← ランキングへ
      </Link>

      {/* Profile header */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--color-card-elevated) 0%, var(--color-card) 100%)',
          boxShadow: 'var(--shadow-card), 0 0 24px rgba(0,200,255,0.08)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[var(--color-primary)]/6 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative">
          <Avatar className="h-16 w-16 ring-2 ring-[var(--color-border)]">
            <AvatarImage src={targetProfile.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl font-black">{targetProfile.nickname[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black truncate">{targetProfile.nickname}</h1>
              {targetRating.is_provisional && (
                <Badge variant="provisional" className="text-[10px]">仮</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <Medal className="h-3.5 w-3.5 text-[var(--color-gold)]" />
                <span className="text-sm font-bold text-[var(--color-gold)]">#{rank}</span>
                <span className="text-xs text-[var(--color-muted-foreground)]">/ {totalCount ?? 0}人</span>
              </div>
              <span className="text-2xl font-black neon-text tabular-nums">{Math.round(Number(targetRating.rating))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <MyStatsCard
        rating={Number(targetRating.rating)}
        rank={rank}
        totalMembers={totalCount ?? 0}
        wins={targetRating.wins}
        losses={targetRating.losses}
        winRate={winRate}
        approvedMatchCount={targetRating.approved_match_count}
        currentStreak={targetRating.current_streak}
        highestRating={Number(targetRating.highest_rating)}
        isProvisional={targetRating.is_provisional}
      />

      {/* Rating chart */}
      {chartPoints.length > 1 && (
        <div>
          <h2 className="font-semibold text-sm mb-3">レート推移</h2>
          <RatingChart data={chartPoints} />
        </div>
      )}

      {/* Personal bests */}
      <PersonalBestsCard bests={bests} />

      {/* Head to head */}
      <HeadToHeadCard entries={h2hEntries} />
    </div>
  );
}
