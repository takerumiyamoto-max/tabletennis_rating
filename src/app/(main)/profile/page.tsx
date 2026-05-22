import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser, getUserProfile, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import Link from 'next/link';
import { RatingChart } from '@/components/profile/rating-chart';
import { MyStatsCard } from '@/components/profile/my-stats-card';
import { ProfileEditForm } from '@/components/profile/profile-edit-form';
import { SignOutButton } from '@/components/profile/sign-out-button';
import { PersonalBestsCard } from '@/components/profile/personal-bests-card';
import { HeadToHeadCard } from '@/components/profile/head-to-head-card';
import { buildPersonalBests } from '@/lib/gamification/stats';
import { buildHeadToHead } from '@/lib/gamification/headToHead';
import { PlayerBadgePreview } from '@/components/badges/player-badge-preview';
import type { RatingChartPoint } from '@/types/app';
import type { RatingHistory, Match, BadgeDefinition } from '@/types/database';

export default async function ProfilePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const [profile, memberData] = await Promise.all([
    getUserProfile(user.id),
    getActiveGroupMember(user.id),
  ]);

  if (!profile || !memberData) redirect('/onboarding');
  const groupId = memberData.group_id;
  const isAdmin = memberData.role === 'owner' || memberData.role === 'admin';

  const supabase = await createClient();

  const [
    { data: playerRating },
    { data: historiesRaw },
    { data: h2hMatchesRaw },
    { data: myBadgeRows },
  ] = await Promise.all([
    supabase.from('player_ratings').select('*').eq('group_id', groupId).eq('user_id', user.id).single(),
    supabase.from('rating_histories').select('*').eq('group_id', groupId).eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(60),
    supabase.from('matches')
      .select('*').eq('group_id', groupId).eq('status', 'approved')
      .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
      .order('approved_at', { ascending: false }).limit(100),
    supabase.from('player_badges')
      .select('badge_id, unlocked_at')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })
      .limit(6),
  ]);

  const histories  = historiesRaw as RatingHistory[] | null;
  const h2hMatches = h2hMatchesRaw as Match[] ?? [];

  // バッジ定義を取得して UnlockedBadge 配列を構築
  const badgeIds = myBadgeRows?.map(b => b.badge_id) ?? [];
  const { data: badgeDefsRaw } = badgeIds.length > 0
    ? await supabase.from('badge_definitions').select('*').in('id', badgeIds)
    : { data: [] as BadgeDefinition[] };
  const badgeDefMap = new Map((badgeDefsRaw ?? []).map((b: BadgeDefinition) => [b.id, b]));
  const unlockedBadges = (myBadgeRows ?? [])
    .map(r => {
      const def = badgeDefMap.get(r.badge_id);
      return def ? { ...def, unlocked_at: r.unlocked_at } : null;
    })
    .filter((b): b is BadgeDefinition & { unlocked_at: string } => b !== null);

  const opponentIds = [...new Set(h2hMatches.map(m =>
    m.player_a_id === user.id ? m.player_b_id : m.player_a_id
  ))];
  const winMatchIds = (histories ?? []).filter(h => h.result === 'win').map(h => h.match_id);

  const [
    { count: rankCount },
    { count: totalCount },
    { data: oppProfiles },
    { data: oppRatings },
    { data: oppWinHistories },
  ] = await Promise.all([
    supabase.from('player_ratings').select('user_id', { count: 'exact', head: true })
      .eq('group_id', groupId).gt('rating', playerRating?.rating ?? 0),
    supabase.from('player_ratings').select('user_id', { count: 'exact', head: true })
      .eq('group_id', groupId),
    opponentIds.length > 0
      ? supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', opponentIds)
      : Promise.resolve({ data: [] as { user_id: string; nickname: string; avatar_url: string | null }[] }),
    opponentIds.length > 0
      ? supabase.from('player_ratings').select('user_id, rating').eq('group_id', groupId).in('user_id', opponentIds)
      : Promise.resolve({ data: [] as { user_id: string; rating: number }[] }),
    winMatchIds.length > 0
      ? supabase.from('rating_histories')
          .select('match_id, user_id, rating_before')
          .in('match_id', winMatchIds).neq('user_id', user.id)
      : Promise.resolve({ data: [] as { match_id: string; user_id: string; rating_before: number }[] }),
  ]);

  const rank = (rankCount ?? 0) + 1;

  const profileMap = new Map(oppProfiles?.map(p => [p.user_id, p]) ?? []);
  const ratingMap  = new Map(oppRatings?.map(r => [r.user_id, Math.round(Number(r.rating))]) ?? []);

  // Chart opponent names (histories are ascending, so we need names from chart opp ids)
  const chartOppIds = [...new Set((histories ?? []).map(h => h.opponent_id))];
  const { data: chartOppProfiles } = chartOppIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname').in('user_id', chartOppIds)
    : { data: [] as { user_id: string; nickname: string }[] };
  const chartOppMap = new Map(chartOppProfiles?.map(p => [p.user_id, p.nickname]) ?? []);

  const opponentHistByMatchId = new Map(
    (oppWinHistories ?? []).map(h => [h.match_id, h as unknown as RatingHistory])
  );

  const bests = playerRating
    ? buildPersonalBests(playerRating, histories ?? [], opponentHistByMatchId)
    : null;

  const h2hEntries = buildHeadToHead(h2hMatches, user.id, profileMap, ratingMap);

  const chartPoints: RatingChartPoint[] = [];
  if (playerRating) {
    chartPoints.push({
      date:              profile.created_at,
      rating:            playerRating.initial_rating,
      rating_display:    playerRating.initial_rating,
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

  const winRate = playerRating
    ? playerRating.wins + playerRating.losses > 0
      ? Math.round((playerRating.wins / (playerRating.wins + playerRating.losses)) * 100)
      : 0
    : 0;

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      <ProfileEditForm
        profile={profile}
        rating={playerRating ? Number(playerRating.rating) : undefined}
        rank={rank}
        isProvisional={playerRating?.is_provisional}
      />

      {playerRating && (
        <MyStatsCard
          rating={Number(playerRating.rating)}
          rank={rank}
          totalMembers={totalCount ?? 0}
          wins={playerRating.wins}
          losses={playerRating.losses}
          winRate={winRate}
          approvedMatchCount={playerRating.approved_match_count}
          currentStreak={playerRating.current_streak}
          highestRating={Number(playerRating.highest_rating)}
          isProvisional={playerRating.is_provisional}
        />
      )}

      {chartPoints.length > 1 && (
        <div>
          <h2 className="font-semibold text-sm mb-3">レート推移</h2>
          <RatingChart data={chartPoints} />
        </div>
      )}

      {bests && <PersonalBestsCard bests={bests} />}

      {h2hEntries.length > 0 && <HeadToHeadCard entries={h2hEntries} />}

      {/* 獲得バッジ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">獲得バッジ</h2>
        </div>
        <PlayerBadgePreview badges={unlockedBadges} showSeeAll maxCount={6} />
      </div>

      {/* グループ管理リンク */}
      <Link
        href="/groups"
        className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-neon-dim)] transition-all group"
      >
        <div>
          <p className="text-sm font-semibold group-hover:text-[var(--color-primary)] transition-colors">
            所属グループ管理
          </p>
          <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
            {(memberData.groups as unknown as { name: string })?.name} · 切り替え・参加・作成
          </p>
        </div>
        <svg className="h-4 w-4 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      {isAdmin && (
        <Link
          href="/admin"
          className="block text-center text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors py-2"
        >
          管理者画面 →
        </Link>
      )}

      <SignOutButton />
    </div>
  );
}
