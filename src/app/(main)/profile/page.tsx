import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { RatingChart } from '@/components/profile/rating-chart';
import { MyStatsCard } from '@/components/profile/my-stats-card';
import { ProfileEditForm } from '@/components/profile/profile-edit-form';
import type { RatingChartPoint } from '@/types/app';
import type { RatingHistory } from '@/types/database';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: memberData } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  if (!profile || !memberData) redirect('/onboarding');
  const groupId = memberData.group_id;
  const isAdmin = memberData.role === 'owner' || memberData.role === 'admin';

  const { data: playerRating } = await supabase
    .from('player_ratings')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  // ランキング順位
  const { count: rankCount } = await supabase
    .from('player_ratings')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .gt('rating', playerRating?.rating ?? 0);

  const { count: totalCount } = await supabase
    .from('player_ratings')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);

  const rank = (rankCount ?? 0) + 1;

  // レート推移履歴 (join は型推論が複雑なため RatingHistory[] にアサート)
  const { data: historiesRaw } = await supabase
    .from('rating_histories')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50);
  const histories = historiesRaw as RatingHistory[] | null;

  // 対戦相手プロフィール
  const oppIds = histories?.map(h => h.opponent_id) ?? [];
  const { data: oppProfiles } = oppIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname').in('user_id', oppIds)
    : { data: [] };
  const oppMap = new Map(oppProfiles?.map(p => [p.user_id, p.nickname]) ?? []);

  // グラフデータ (初期レートから始める)
  const chartPoints: RatingChartPoint[] = [];
  if (playerRating) {
    // 最初の点 (初期レート)
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
      {/* プロフィールヒーロー */}
      <ProfileEditForm
        profile={profile}
        rating={playerRating ? Number(playerRating.rating) : undefined}
        rank={rank}
        isProvisional={playerRating?.is_provisional}
      />

      {/* 統計カード */}
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

      {/* レート推移グラフ */}
      {chartPoints.length > 1 && (
        <div>
          <h2 className="font-semibold text-sm mb-3">レート推移</h2>
          <RatingChart data={chartPoints} />
        </div>
      )}

      {/* 管理者リンク */}
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
