import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import { RankingList } from '@/components/ranking/ranking-list';
import { WeeklyRanking } from '@/components/home/weekly-ranking';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildWeeklyRanking, getSevenDaysAgo } from '@/lib/gamification/stats';
import type { RankingEntry } from '@/types/app';

export default async function RankingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const memberData = await getActiveGroupMember(user.id);
  if (!memberData) redirect('/onboarding');

  const groupId   = memberData.group_id;
  const groupName = (memberData.groups as unknown as { name: string })?.name ?? '';

  const supabase = await createClient();

  const [{ data: ratings }, { data: weeklyHistories }] = await Promise.all([
    supabase.from('player_ratings').select('*').eq('group_id', groupId).order('rating', { ascending: false }),
    supabase.from('rating_histories')
      .select('user_id, rating_change, created_at')
      .eq('group_id', groupId)
      .gte('created_at', getSevenDaysAgo())
      .limit(300),
  ]);

  if (!ratings) return null;

  const userIds = ratings.map(r => r.user_id);
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', userIds)
    : { data: [] };

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);
  const ratingMap  = new Map(ratings.map(r => [r.user_id, Math.round(Number(r.rating))]));

  const entries: RankingEntry[] = ratings.map((r, i) => {
    const profile = profileMap.get(r.user_id);
    return {
      rank:                 i + 1,
      user_id:              r.user_id,
      nickname:             profile?.nickname   ?? '?',
      avatar_url:           profile?.avatar_url ?? null,
      rating:               Number(r.rating),
      rating_display:       Math.round(Number(r.rating)),
      initial_rating:       r.initial_rating,
      wins:                 r.wins,
      losses:               r.losses,
      approved_match_count: r.approved_match_count,
      is_provisional:       r.is_provisional,
      current_streak:       r.current_streak,
      highest_rating:       Number(r.highest_rating),
      rating_change_today:  null,
    };
  });

  const weeklyEntries = buildWeeklyRanking(weeklyHistories ?? [], profileMap, ratingMap);

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="mb-5">
        <p className="text-[var(--color-muted-foreground)] text-sm">{groupName}</p>
        <h1 className="text-xl font-bold">ランキング</h1>
      </div>

      <Tabs defaultValue="overall">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="overall" className="flex-1">総合</TabsTrigger>
          <TabsTrigger value="weekly"  className="flex-1">今週の成長</TabsTrigger>
        </TabsList>

        <TabsContent value="overall">
          <RankingList entries={entries} currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="weekly">
          <p className="text-xs text-[var(--color-muted-foreground)] mb-3">直近7日間のレート増加量</p>
          <WeeklyRanking entries={weeklyEntries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
