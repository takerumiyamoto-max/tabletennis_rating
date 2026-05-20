import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RatingCard } from '@/components/home/rating-card';
import { PendingApprovals } from '@/components/home/pending-approvals';
import { RecentMatches } from '@/components/home/recent-matches';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // プロフィール取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // グループメンバー情報 (最初のグループ)
  const { data: memberData } = await supabase
    .from('group_members')
    .select('*, groups(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  if (!profile || !memberData) redirect('/onboarding');

  const groupId = memberData.group_id;

  // プレイヤーレート取得
  const { data: playerRating } = await supabase
    .from('player_ratings')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  // ランキング順位計算
  const { count: rankCount } = await supabase
    .from('player_ratings')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .gt('rating', playerRating?.rating ?? 0);

  const rank = (rankCount ?? 0) + 1;

  // 承認待ち試合
  const { data: pendingMatches } = await supabase
    .from('matches')
    .select('*, profiles!matches_player_a_id_fkey(nickname, avatar_url), profiles!matches_player_b_id_fkey(nickname, avatar_url)')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(5);

  // 最近の試合 (承認済み)
  const { data: recentMatches } = await supabase
    .from('rating_histories')
    .select('*, matches(match_format, player_a_sets, player_b_sets, status)')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // 対戦相手プロフィール取得
  const opponentIds = recentMatches?.map(m => m.opponent_id) ?? [];
  const { data: opponentProfiles } = opponentIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', opponentIds)
    : { data: [] };

  const opponentMap = new Map(opponentProfiles?.map(p => [p.user_id, p]) ?? []);

  return (
    <div className="px-4 pt-6 space-y-5 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[var(--color-muted-foreground)] text-sm">{(memberData.groups as { name: string })?.name}</p>
          <h1 className="text-xl font-bold">{profile.nickname}</h1>
        </div>
        <div className="text-right text-xs text-[var(--color-muted-foreground)]">
          今日も頑張ろう 🏓
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
