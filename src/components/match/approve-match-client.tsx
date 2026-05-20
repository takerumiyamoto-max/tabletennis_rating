'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { calculateRatingUpdate, toRatingSettings, displayRatingChange } from '@/lib/rating/elo';
import type { Match } from '@/types/database';

interface PlayerInfo {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
}

interface Props {
  match: Match;
  playerA: PlayerInfo;
  playerB: PlayerInfo;
  currentUserId: string;
}

export function ApproveMatchClient({ match, playerA, playerB, currentUserId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isApprover = match.player_b_id === currentUserId && match.submitted_by !== currentUserId;
  const canAct = match.status === 'pending' && isApprover;
  const winner = match.winner_id === playerA.user_id ? playerA : playerB;

  async function handleApprove() {
    setLoading(true);
    try {
      const supabase = createClient();

      // レート設定取得
      const { data: settings } = await supabase
        .from('group_rating_settings')
        .select('*')
        .eq('group_id', match.group_id)
        .single();

      // 両プレイヤーのレート取得
      const { data: ratings } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('group_id', match.group_id)
        .in('user_id', [match.player_a_id, match.player_b_id]);

      const ratingA = ratings?.find(r => r.user_id === match.player_a_id);
      const ratingB = ratings?.find(r => r.user_id === match.player_b_id);
      if (!ratingA || !ratingB) throw new Error('レート情報が見つかりません');

      // レート計算
      const ratingSettings = settings ? toRatingSettings(settings) : undefined;
      const result = calculateRatingUpdate(
        {
          playerAId: match.player_a_id,
          playerBId: match.player_b_id,
          winnerId:  match.winner_id,
          format:    match.match_format,
          playerASets: match.player_a_sets,
          playerBSets: match.player_b_sets,
        },
        {
          userId: match.player_a_id,
          rating: Number(ratingA.rating),
          approvedMatchCount: ratingA.approved_match_count,
        },
        {
          userId: match.player_b_id,
          rating: Number(ratingB.rating),
          approvedMatchCount: ratingB.approved_match_count,
        },
        ratingSettings
      );

      const now = new Date().toISOString();

      // match を approved に更新
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'approved', approved_by: currentUserId, approved_at: now })
        .eq('id', match.id);
      if (matchError) throw matchError;

      // rating_histories に挿入
      await supabase.from('rating_histories').insert([
        {
          group_id: match.group_id,
          match_id: match.id,
          user_id: match.player_a_id,
          opponent_id: match.player_b_id,
          rating_before: result.playerA.ratingBefore,
          rating_after:  result.playerA.ratingAfter,
          rating_change: result.playerA.ratingChange,
          result: result.playerA.result,
        },
        {
          group_id: match.group_id,
          match_id: match.id,
          user_id: match.player_b_id,
          opponent_id: match.player_a_id,
          rating_before: result.playerB.ratingBefore,
          rating_after:  result.playerB.ratingAfter,
          rating_change: result.playerB.ratingChange,
          result: result.playerB.result,
        },
      ]);

      // player_ratings 更新 (A)
      const streakA = result.playerA.result === 'win'
        ? Math.max(ratingA.current_streak, 0) + 1
        : Math.min(ratingA.current_streak, 0) - 1;
      await supabase.from('player_ratings').update({
        rating: result.playerA.ratingAfter,
        wins:   ratingA.wins   + (result.playerA.result === 'win' ? 1 : 0),
        losses: ratingA.losses + (result.playerA.result === 'loss' ? 1 : 0),
        approved_match_count: ratingA.approved_match_count + 1,
        current_streak: streakA,
        highest_rating: Math.max(Number(ratingA.highest_rating), result.playerA.ratingAfter),
        lowest_rating:  Math.min(Number(ratingA.lowest_rating),  result.playerA.ratingAfter),
      }).eq('group_id', match.group_id).eq('user_id', match.player_a_id);

      // player_ratings 更新 (B)
      const streakB = result.playerB.result === 'win'
        ? Math.max(ratingB.current_streak, 0) + 1
        : Math.min(ratingB.current_streak, 0) - 1;
      await supabase.from('player_ratings').update({
        rating: result.playerB.ratingAfter,
        wins:   ratingB.wins   + (result.playerB.result === 'win' ? 1 : 0),
        losses: ratingB.losses + (result.playerB.result === 'loss' ? 1 : 0),
        approved_match_count: ratingB.approved_match_count + 1,
        current_streak: streakB,
        highest_rating: Math.max(Number(ratingB.highest_rating), result.playerB.ratingAfter),
        lowest_rating:  Math.min(Number(ratingB.lowest_rating),  result.playerB.ratingAfter),
      }).eq('group_id', match.group_id).eq('user_id', match.player_b_id);

      toast({ title: '承認完了', description: `レートが更新されました`, variant: 'success' });
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.from('matches').update({
        status: 'rejected',
        rejected_by: currentUserId,
        rejected_at: new Date().toISOString(),
      }).eq('id', match.id);

      toast({ title: '却下しました', variant: 'default' });
      router.push('/');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.from('matches').update({
        status: 'cancelled',
        cancelled_by: currentUserId,
        cancelled_at: new Date().toISOString(),
      }).eq('id', match.id);

      toast({ title: 'キャンセルしました', variant: 'default' });
      router.push('/');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const statusLabel: Record<string, string> = {
    pending:   '承認待ち',
    approved:  '承認済み',
    rejected:  '却下',
    cancelled: 'キャンセル',
    corrected: '修正済み',
  };

  return (
    <div className="space-y-5">
      {/* ステータス */}
      <div className="flex justify-end">
        <Badge variant={match.status === 'pending' ? 'pending' : match.status === 'approved' ? 'win' : 'loss'}>
          {statusLabel[match.status]}
        </Badge>
      </div>

      {/* 試合内容カード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--color-primary)]" />
            試合内容
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 対戦カード */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex flex-col items-center gap-2">
              <Avatar className="h-12 w-12">
                <AvatarImage src={playerA.avatar_url ?? undefined} />
                <AvatarFallback>{playerA.nickname[0]}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-center">{playerA.nickname}</p>
              {match.winner_id === playerA.user_id && (
                <Badge variant="win">勝</Badge>
              )}
            </div>
            <div className="text-center">
              <p className="text-3xl font-black tabular-nums">
                <span className={match.winner_id === playerA.user_id ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}>{match.player_a_sets}</span>
                <span className="text-[var(--color-muted-foreground)] mx-1">-</span>
                <span className={match.winner_id === playerB.user_id ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}>{match.player_b_sets}</span>
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                {match.match_format === 'best_of_5' ? '5ゲーム制' : '3ゲーム制'}
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <Avatar className="h-12 w-12">
                <AvatarImage src={playerB.avatar_url ?? undefined} />
                <AvatarFallback>{playerB.nickname[0]}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-center">{playerB.nickname}</p>
              {match.winner_id === playerB.user_id && (
                <Badge variant="win">勝</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      {canAct && (
        <div className="space-y-3">
          <Button
            onClick={handleApprove}
            variant="win"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
            承認する
          </Button>
          <Button
            onClick={handleReject}
            variant="destructive"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-5 w-5" />}
            却下する
          </Button>
        </div>
      )}

      {/* 申請者のみキャンセル可 */}
      {match.status === 'pending' && match.submitted_by === currentUserId && (
        <Button
          onClick={handleCancel}
          variant="outline"
          className="w-full"
          disabled={loading}
        >
          申請を取り消す
        </Button>
      )}

      {match.status !== 'pending' && (
        <p className="text-center text-sm text-[var(--color-muted-foreground)]">
          この試合は処理済みです
        </p>
      )}
    </div>
  );
}
