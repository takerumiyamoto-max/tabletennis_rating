import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser, getUserProfile, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import Link from 'next/link';
import { RatingChart } from '@/components/profile/rating-chart';
import { MyStatsCard } from '@/components/profile/my-stats-card';
import { ProfileEditForm } from '@/components/profile/profile-edit-form';
import type { RatingChartPoint } from '@/types/app';
import type { RatingHistory } from '@/types/database';

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
  ] = await Promise.all([
    supabase.from('player_ratings').select('*').eq('group_id', groupId).eq('user_id', user.id).single(),
    supabase.from('rating_histories').select('*').eq('group_id', groupId).eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(50),
  ]);

  const histories = historiesRaw as RatingHistory[] | null;

  const [
    { count: rankCount },
    { count: totalCount },
    { data: oppProfiles },
  ] = await Promise.all([
    supabase.from('player_ratings').select('*', { count: 'exact', head: true })
      .eq('group_id', groupId).gt('rating', playerRating?.rating ?? 0),
    supabase.from('player_ratings').select('*', { count: 'exact', head: true })
      .eq('group_id', groupId),
    (histories?.length ?? 0) > 0
      ? supabase.from('profiles').select('user_id, nickname')
          .in('user_id', histories!.map(h => h.opponent_id))
      : Promise.resolve({ data: [] as { user_id: string; nickname: string }[] }),
  ]);

  const rank = (rankCount ?? 0) + 1;
  const oppMap = new Map(oppProfiles?.map(p => [p.user_id, p.nickname]) ?? []);

  const chartPoints: RatingChartPoint[] = [];
  if (playerRating) {
    chartPoints.push({
      date: profile.created_at,
      rating: playerRating.initial_rating,
      rating_display: playerRating.initial_rating,
      match_id: 'initial',
      result: 'win',
      opponent_nickname: '開始',
    });
    histories?.forEach(h => {
      chartPoints.push({
        date: h.created_at,
        rating: Number(h.rating_after),
        rating_display: Math.round(Number(h.rating_after)),
        match_id: h.match_id,
        result: h.result,
        opponent_nickname: oppMap.get(h.opponent_id) ?? '?',
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
    </div>
  );
}
