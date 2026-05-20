import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ApproveMatchClient } from '@/components/match/approve-match-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApproveMatchPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (!match) notFound();

  // 試合に関係するユーザーのみアクセス可
  if (match.player_a_id !== user.id && match.player_b_id !== user.id) {
    redirect('/');
  }

  // プレイヤーA/Bのプロフィール取得
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, nickname, avatar_url')
    .in('user_id', [match.player_a_id, match.player_b_id]);

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);
  const playerA = profileMap.get(match.player_a_id);
  const playerB = profileMap.get(match.player_b_id);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">試合結果の承認</h1>
      <ApproveMatchClient
        match={match}
        playerA={playerA ?? { user_id: match.player_a_id, nickname: '?', avatar_url: null }}
        playerB={playerB ?? { user_id: match.player_b_id, nickname: '?', avatar_url: null }}
        currentUserId={user.id}
      />
    </div>
  );
}
