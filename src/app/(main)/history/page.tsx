import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MatchHistoryList } from '@/components/history/match-history-list';

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberData } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  if (!memberData) redirect('/onboarding');
  const groupId = memberData.group_id;

  // 自分の履歴
  const { data: myHistories } = await supabase
    .from('rating_histories')
    .select('*, matches(match_format, player_a_sets, player_b_sets, player_a_id, player_b_id, status)')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  // グループ全体の最近の承認済み試合
  const { data: groupMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(30);

  // 対戦相手プロフィール収集
  const opponentIds = [
    ...(myHistories?.map(h => h.opponent_id) ?? []),
    ...(groupMatches?.flatMap(m => [m.player_a_id, m.player_b_id]) ?? []),
  ];
  const uniqueIds = [...new Set(opponentIds)];
  const { data: profiles } = uniqueIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', uniqueIds)
    : { data: [] };

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-5">履歴</h1>
      <Tabs defaultValue="mine">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="mine" className="flex-1">自分の試合</TabsTrigger>
          <TabsTrigger value="group" className="flex-1">グループ全体</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <MatchHistoryList
            histories={myHistories ?? []}
            profileMap={profileMap}
            currentUserId={user.id}
            mode="mine"
          />
        </TabsContent>
        <TabsContent value="group">
          <MatchHistoryList
            matches={groupMatches ?? []}
            profileMap={profileMap}
            currentUserId={user.id}
            mode="group"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
