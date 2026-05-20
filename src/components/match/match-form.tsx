'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trophy, Check, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchFormat } from '@/types/database';

interface Opponent {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
}

interface MatchFormProps {
  groupId: string;
  userId: string;
  opponents: Opponent[];
}

type SetScore = { a: number; b: number };

const BEST_OF_3_SCORES: SetScore[] = [
  { a: 2, b: 0 }, { a: 2, b: 1 },
  { a: 0, b: 2 }, { a: 1, b: 2 },
];

const BEST_OF_5_SCORES: SetScore[] = [
  { a: 3, b: 0 }, { a: 3, b: 1 }, { a: 3, b: 2 },
  { a: 0, b: 3 }, { a: 1, b: 3 }, { a: 2, b: 3 },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all',
              done
                ? 'bg-[var(--color-win)] text-white'
                : active
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[0_0_10px_rgba(0,200,255,0.4)]'
                : 'bg-[var(--color-card-elevated)] border border-[var(--color-border)] text-[var(--color-muted-foreground)]'
            )}>
              {done ? <Check className="h-3 w-3" /> : step}
            </div>
            {i < total - 1 && (
              <div className={cn('flex-1 h-px transition-all', done ? 'bg-[var(--color-win)]/50' : 'bg-[var(--color-border)]')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MatchForm({ groupId, userId, opponents }: MatchFormProps) {
  const router = useRouter();
  const [opponentId, setOpponentId]   = useState<string | null>(null);
  const [format, setFormat]           = useState<MatchFormat>('best_of_5');
  const [score, setScore]             = useState<SetScore | null>(null);
  const [loading, setLoading]         = useState(false);

  const scores = format === 'best_of_3' ? BEST_OF_3_SCORES : BEST_OF_5_SCORES;
  const winnerId = score ? (score.a > score.b ? userId : opponentId) : null;
  const canSubmit = opponentId && score;

  const currentStep = !opponentId ? 1 : !score ? 2 : 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!opponentId || !score) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('matches').insert({
        group_id:     groupId,
        submitted_by: userId,
        player_a_id:  userId,
        player_b_id:  opponentId,
        winner_id:    score.a > score.b ? userId : opponentId,
        match_format: format,
        player_a_sets: score.a,
        player_b_sets: score.b,
        status: 'pending',
      });
      if (error) throw error;

      await supabase.from('notifications').insert({
        group_id: groupId,
        user_id: opponentId,
        type: 'match_approval_request',
        title: '試合結果の承認依頼',
        body: '試合結果が入力されました。確認して承認してください。',
      });

      toast({ title: '送信完了', description: '相手に承認依頼を送りました', variant: 'success' });
      router.push('/');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const selectedOpponent = opponents.find(o => o.user_id === opponentId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <StepIndicator current={currentStep} total={3} />

      {/* STEP 1: 対戦相手選択 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-neon-dim)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/30">
            STEP 1
          </span>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">対戦相手を選択</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {opponents.map((opp) => {
            const selected = opponentId === opp.user_id;
            return (
              <button
                key={opp.user_id}
                type="button"
                onClick={() => setOpponentId(opp.user_id)}
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left',
                  selected
                    ? 'border-[var(--color-primary)] bg-[var(--color-neon-dim)] shadow-[0_0_12px_rgba(0,200,255,0.2)]'
                    : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-card-elevated)]'
                )}
              >
                <Avatar className={cn('h-9 w-9 shrink-0', selected && 'ring-2 ring-[var(--color-primary)]/60')}>
                  <AvatarImage src={opp.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{opp.nickname[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold truncate', selected && 'text-[var(--color-primary)]')}>
                    {opp.nickname}
                  </p>
                </div>
                {selected && <Check className="h-4 w-4 text-[var(--color-primary)] shrink-0" />}
              </button>
            );
          })}
        </div>
        {opponents.length === 0 && (
          <p className="text-sm text-[var(--color-muted-foreground)] text-center py-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
            グループに他のメンバーがいません
          </p>
        )}
      </div>

      {/* STEP 2: 試合形式 + スコア */}
      {opponentId && (
        <>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-neon-dim)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/30">
                STEP 2
              </span>
              <p className="text-sm font-semibold">試合形式</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['best_of_5', 'best_of_3'] as MatchFormat[]).map((f) => {
                const selected = format === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => { setFormat(f); setScore(null); }}
                    className={cn(
                      'p-4 rounded-xl border transition-all text-center',
                      selected
                        ? 'border-[var(--color-primary)] bg-[var(--color-neon-dim)] shadow-[0_0_12px_rgba(0,200,255,0.2)]'
                        : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-card-elevated)]'
                    )}
                  >
                    <Swords className={cn('h-5 w-5 mx-auto mb-1.5', selected ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]')} />
                    <p className={cn('text-sm font-bold', selected && 'text-[var(--color-primary)]')}>
                      {f === 'best_of_5' ? '5ゲーム制' : '3ゲーム制'}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
                      {f === 'best_of_5' ? '先取3ゲーム' : '先取2ゲーム'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-neon-dim)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/30">
                STEP 3
              </span>
              <p className="text-sm font-semibold">スコア <span className="text-[var(--color-muted-foreground)] font-normal text-xs">(自分 - 相手)</span></p>
            </div>

            {/* 勝利スコア */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[var(--color-win)] font-semibold uppercase tracking-wider px-1">勝利</p>
              <div className="grid grid-cols-3 gap-2">
                {scores.filter(s => s.a > s.b).map((s) => {
                  const selected = score?.a === s.a && score?.b === s.b;
                  return (
                    <button
                      key={`${s.a}-${s.b}`}
                      type="button"
                      onClick={() => setScore(s)}
                      className={cn(
                        'py-3.5 rounded-xl border transition-all text-center',
                        selected
                          ? 'border-[var(--color-win)] bg-[var(--color-win)]/15 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                          : 'border-[var(--color-win)]/20 bg-[var(--color-win)]/5 hover:border-[var(--color-win)]/50 hover:bg-[var(--color-win)]/10'
                      )}
                    >
                      <p className={cn('text-xl font-black tabular-nums', selected ? 'text-[var(--color-win)]' : 'text-[var(--color-foreground)]')}>
                        {s.a}<span className="text-[var(--color-muted-foreground)] text-base mx-0.5">-</span>{s.b}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 敗北スコア */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[var(--color-loss)] font-semibold uppercase tracking-wider px-1">敗北</p>
              <div className="grid grid-cols-3 gap-2">
                {scores.filter(s => s.b > s.a).map((s) => {
                  const selected = score?.a === s.a && score?.b === s.b;
                  return (
                    <button
                      key={`${s.a}-${s.b}`}
                      type="button"
                      onClick={() => setScore(s)}
                      className={cn(
                        'py-3.5 rounded-xl border transition-all text-center',
                        selected
                          ? 'border-[var(--color-loss)] bg-[var(--color-loss)]/15 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                          : 'border-[var(--color-loss)]/20 bg-[var(--color-loss)]/5 hover:border-[var(--color-loss)]/50 hover:bg-[var(--color-loss)]/10'
                      )}
                    >
                      <p className={cn('text-xl font-black tabular-nums', selected ? 'text-[var(--color-loss)]' : 'text-[var(--color-foreground)]')}>
                        {s.a}<span className="text-[var(--color-muted-foreground)] text-base mx-0.5">-</span>{s.b}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 確認サマリー */}
      {canSubmit && (
        <div
          className="rounded-xl border border-[var(--color-primary)]/30 p-4 space-y-3"
          style={{ background: 'linear-gradient(135deg, rgba(0,200,255,0.08) 0%, var(--color-card) 100%)', boxShadow: '0 0 16px rgba(0,200,255,0.1)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-[var(--color-primary)]" />
            <p className="text-sm font-bold text-[var(--color-primary)]">入力内容の確認</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={selectedOpponent?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{selectedOpponent?.nickname[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold truncate">{selectedOpponent?.nickname}</span>
            </div>
            <div className="text-center px-3">
              <p className="text-2xl font-black tabular-nums">
                <span className={winnerId === userId ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}>{score?.a}</span>
                <span className="text-[var(--color-muted-foreground)] text-lg mx-1">-</span>
                <span className={winnerId !== userId ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}>{score?.b}</span>
              </p>
            </div>
            <div className="text-right flex-1 flex justify-end">
              <span className={cn(
                'text-sm font-bold px-3 py-1.5 rounded-lg',
                winnerId === userId
                  ? 'bg-[var(--color-win)]/15 text-[var(--color-win)] border border-[var(--color-win)]/30'
                  : 'bg-[var(--color-loss)]/15 text-[var(--color-loss)] border border-[var(--color-loss)]/30'
              )}>
                {winnerId === userId ? '勝利' : '敗北'}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-center text-[var(--color-muted-foreground)]">
            {format === 'best_of_5' ? '5ゲーム制' : '3ゲーム制'}
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={!canSubmit || loading}>
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" />送信中...</>
          : canSubmit
          ? <><Trophy className="h-4 w-4" />承認依頼を送る</>
          : '対戦相手とスコアを選択してください'
        }
      </Button>
    </form>
  );
}
