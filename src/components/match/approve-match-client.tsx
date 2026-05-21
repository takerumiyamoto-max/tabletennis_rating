'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FadeInUp, FadeInScale } from '@/components/ui/motion';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Trophy, Swords } from 'lucide-react';
import { calculateRatingUpdate, toRatingSettings } from '@/lib/rating/elo';
import { cn } from '@/lib/utils';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: '承認待ち', color: 'text-[var(--color-provisional)]', bg: 'bg-[var(--color-provisional)]/15 border-[var(--color-provisional)]/30' },
  approved:  { label: '承認済み', color: 'text-[var(--color-win)]',         bg: 'bg-[var(--color-win)]/15 border-[var(--color-win)]/30' },
  rejected:  { label: '却下',     color: 'text-[var(--color-loss)]',        bg: 'bg-[var(--color-loss)]/15 border-[var(--color-loss)]/30' },
  cancelled: { label: 'キャンセル', color: 'text-[var(--color-muted-foreground)]', bg: 'bg-[var(--color-muted)]/30 border-[var(--color-border)]' },
  corrected: { label: '修正済み', color: 'text-[var(--color-muted-foreground)]', bg: 'bg-[var(--color-muted)]/30 border-[var(--color-border)]' },
};

export function ApproveMatchClient({ match, playerA, playerB, currentUserId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isApprover = match.player_b_id === currentUserId && match.submitted_by !== currentUserId;
  const canAct     = match.status === 'pending' && isApprover;
  const aWon       = match.winner_id === playerA.user_id;
  const status     = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.cancelled;

  async function handleApprove() {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: settings } = await supabase
        .from('group_rating_settings')
        .select('*')
        .eq('group_id', match.group_id)
        .single();

      const { data: ratings } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('group_id', match.group_id)
        .in('user_id', [match.player_a_id, match.player_b_id]);

      const ratingA = ratings?.find(r => r.user_id === match.player_a_id);
      const ratingB = ratings?.find(r => r.user_id === match.player_b_id);
      if (!ratingA || !ratingB) throw new Error('レート情報が見つかりません');

      const ratingSettings = settings ? toRatingSettings(settings) : undefined;
      const result = calculateRatingUpdate(
        { playerAId: match.player_a_id, playerBId: match.player_b_id, winnerId: match.winner_id, format: match.match_format, playerASets: match.player_a_sets, playerBSets: match.player_b_sets },
        { userId: match.player_a_id, rating: Number(ratingA.rating), approvedMatchCount: ratingA.approved_match_count },
        { userId: match.player_b_id, rating: Number(ratingB.rating), approvedMatchCount: ratingB.approved_match_count },
        ratingSettings
      );

      const now = new Date().toISOString();
      const { error: matchError } = await supabase.from('matches').update({ status: 'approved', approved_by: currentUserId, approved_at: now }).eq('id', match.id);
      if (matchError) throw matchError;

      await supabase.from('rating_histories').insert([
        { group_id: match.group_id, match_id: match.id, user_id: match.player_a_id, opponent_id: match.player_b_id, rating_before: result.playerA.ratingBefore, rating_after: result.playerA.ratingAfter, rating_change: result.playerA.ratingChange, result: result.playerA.result },
        { group_id: match.group_id, match_id: match.id, user_id: match.player_b_id, opponent_id: match.player_a_id, rating_before: result.playerB.ratingBefore, rating_after: result.playerB.ratingAfter, rating_change: result.playerB.ratingChange, result: result.playerB.result },
      ]);

      const streakA = result.playerA.result === 'win' ? Math.max(ratingA.current_streak, 0) + 1 : Math.min(ratingA.current_streak, 0) - 1;
      await supabase.from('player_ratings').update({ rating: result.playerA.ratingAfter, wins: ratingA.wins + (result.playerA.result === 'win' ? 1 : 0), losses: ratingA.losses + (result.playerA.result === 'loss' ? 1 : 0), approved_match_count: ratingA.approved_match_count + 1, current_streak: streakA, highest_rating: Math.max(Number(ratingA.highest_rating), result.playerA.ratingAfter), lowest_rating: Math.min(Number(ratingA.lowest_rating), result.playerA.ratingAfter) }).eq('group_id', match.group_id).eq('user_id', match.player_a_id);

      const streakB = result.playerB.result === 'win' ? Math.max(ratingB.current_streak, 0) + 1 : Math.min(ratingB.current_streak, 0) - 1;
      await supabase.from('player_ratings').update({ rating: result.playerB.ratingAfter, wins: ratingB.wins + (result.playerB.result === 'win' ? 1 : 0), losses: ratingB.losses + (result.playerB.result === 'loss' ? 1 : 0), approved_match_count: ratingB.approved_match_count + 1, current_streak: streakB, highest_rating: Math.max(Number(ratingB.highest_rating), result.playerB.ratingAfter), lowest_rating: Math.min(Number(ratingB.lowest_rating), result.playerB.ratingAfter) }).eq('group_id', match.group_id).eq('user_id', match.player_b_id);

      toast({ title: '承認完了', description: 'レートが更新されました', variant: 'success' });
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
      await supabase.from('matches').update({ status: 'rejected', rejected_by: currentUserId, rejected_at: new Date().toISOString() }).eq('id', match.id);
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
      await supabase.from('matches').update({ status: 'cancelled', cancelled_by: currentUserId, cancelled_at: new Date().toISOString() }).eq('id', match.id);
      toast({ title: 'キャンセルしました', variant: 'default' });
      router.push('/');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ステータスバッジ */}
      <FadeInUp delay={0}>
        <div className="flex justify-end">
          <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full border', status.color, status.bg)}>
            {status.label}
          </span>
        </div>
      </FadeInUp>

      {/* メインマッチカード */}
      <FadeInScale delay={0.05}>
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            borderColor: canAct ? 'rgba(245,158,11,0.4)' : 'var(--color-border)',
            background: 'linear-gradient(145deg, var(--color-card-elevated) 0%, var(--color-card) 100%)',
            boxShadow: canAct ? '0 0 24px rgba(245,158,11,0.12)' : 'var(--shadow-card)',
          }}
        >
          {/* 上部: 試合形式バナー */}
          <div className="flex items-center justify-center gap-2 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <Swords className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest">
              {match.match_format === 'best_of_5' ? '5ゲーム制' : '3ゲーム制'}
            </span>
            <Trophy className="h-3.5 w-3.5 text-[var(--color-provisional)]" />
          </div>

          {/* 対戦エリア */}
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              {/* プレイヤーA */}
              <div className={cn('flex-1 flex flex-col items-center gap-3 transition-opacity', !aWon && 'opacity-40')}>
                <Avatar className={cn('h-16 w-16', aWon && 'ring-2 ring-[var(--color-win)]/50 shadow-[0_0_12px_rgba(34,197,94,0.25)]')}>
                  <AvatarImage src={playerA.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xl font-black">{playerA.nickname[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className={cn('text-sm font-bold', aWon && 'text-[var(--color-foreground)]')}>{playerA.nickname}</p>
                  {aWon && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-win)]/15 text-[var(--color-win)] border border-[var(--color-win)]/30">
                      勝利
                    </span>
                  )}
                </div>
              </div>

              {/* スコア */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <p className="text-4xl font-black tabular-nums tracking-tight">
                  <span className={aWon ? 'text-[var(--color-win)]' : 'text-[var(--color-muted-foreground)]'}>{match.player_a_sets}</span>
                  <span className="text-[var(--color-border)] mx-2 text-3xl">—</span>
                  <span className={!aWon ? 'text-[var(--color-win)]' : 'text-[var(--color-muted-foreground)]'}>{match.player_b_sets}</span>
                </p>
                <span className="text-[10px] text-[var(--color-muted-foreground)] font-medium uppercase tracking-widest">SCORE</span>
              </div>

              {/* プレイヤーB */}
              <div className={cn('flex-1 flex flex-col items-center gap-3 transition-opacity', aWon && 'opacity-40')}>
                <Avatar className={cn('h-16 w-16', !aWon && 'ring-2 ring-[var(--color-win)]/50 shadow-[0_0_12px_rgba(34,197,94,0.25)]')}>
                  <AvatarImage src={playerB.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xl font-black">{playerB.nickname[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className={cn('text-sm font-bold', !aWon && 'text-[var(--color-foreground)]')}>{playerB.nickname}</p>
                  {!aWon && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-win)]/15 text-[var(--color-win)] border border-[var(--color-win)]/30">
                      勝利
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 承認者への案内 */}
          {canAct && (
            <div className="mx-4 mb-4 p-3 rounded-xl bg-[var(--color-provisional)]/8 border border-[var(--color-provisional)]/20 text-center">
              <p className="text-xs text-[var(--color-provisional)] font-medium">
                この試合結果を確認して承認・却下してください
              </p>
            </div>
          )}
        </div>
      </FadeInScale>

      {/* アクションボタン */}
      {canAct && (
        <FadeInUp delay={0.15}>
          <div className="space-y-2.5">
            <Button onClick={handleApprove} variant="win" size="lg" className="w-full text-base" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
              承認する
            </Button>
            <Button onClick={handleReject} variant="destructive" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              却下する
            </Button>
          </div>
        </FadeInUp>
      )}

      {/* 申請者キャンセル */}
      {match.status === 'pending' && match.submitted_by === currentUserId && (
        <FadeInUp delay={0.2}>
          <Button onClick={handleCancel} variant="outline" className="w-full" disabled={loading}>
            申請を取り消す
          </Button>
        </FadeInUp>
      )}

      {/* 処理済み */}
      {match.status !== 'pending' && (
        <p className="text-center text-sm text-[var(--color-muted-foreground)] py-2">
          この試合は処理済みです
        </p>
      )}
    </div>
  );
}
