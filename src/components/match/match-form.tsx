'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trophy, Swords } from 'lucide-react';
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

export function MatchForm({ groupId, userId, opponents }: MatchFormProps) {
  const router = useRouter();
  const [opponentId, setOpponentId]   = useState<string | null>(null);
  const [format, setFormat]           = useState<MatchFormat>('best_of_5');
  const [score, setScore]             = useState<SetScore | null>(null);
  const [loading, setLoading]         = useState(false);

  const scores = format === 'best_of_3' ? BEST_OF_3_SCORES : BEST_OF_5_SCORES;

  // 選択中スコアから勝者を判定
  const winnerId = score
    ? score.a > score.b ? userId : opponentId
    : null;

  const canSubmit = opponentId && score;

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

      // 通知作成
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 対戦相手選択 */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">対戦相手</Label>
        <div className="grid grid-cols-2 gap-2">
          {opponents.map((opp) => (
            <button
              key={opp.user_id}
              type="button"
              onClick={() => setOpponentId(opp.user_id)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border transition-all text-left',
                opponentId === opp.user_id
                  ? 'border-[var(--color-primary)] bg-[var(--color-neon-dim)] neon-glow'
                  : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50'
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={opp.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{opp.nickname[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{opp.nickname}</span>
            </button>
          ))}
        </div>
        {opponents.length === 0 && (
          <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">
            グループに他のメンバーがいません
          </p>
        )}
      </div>

      {/* 試合形式 */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">試合形式</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['best_of_5', 'best_of_3'] as MatchFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFormat(f); setScore(null); }}
              className={cn(
                'p-3 rounded-xl border transition-all text-center',
                format === f
                  ? 'border-[var(--color-primary)] bg-[var(--color-neon-dim)] neon-glow text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50'
              )}
            >
              <Swords className="h-5 w-5 mx-auto mb-1" />
              <p className="text-sm font-semibold">{f === 'best_of_5' ? '5ゲーム制' : '3ゲーム制'}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{f === 'best_of_5' ? '先取3ゲーム' : '先取2ゲーム'}</p>
            </button>
          ))}
        </div>
      </div>

      {/* スコア選択 */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">スコア (自分 - 相手)</Label>
        <div className="grid grid-cols-3 gap-2">
          {scores.map((s) => {
            const selected = score?.a === s.a && score?.b === s.b;
            const iWon = s.a > s.b;
            return (
              <button
                key={`${s.a}-${s.b}`}
                type="button"
                onClick={() => setScore(s)}
                className={cn(
                  'p-3 rounded-xl border transition-all text-center',
                  selected
                    ? iWon
                      ? 'border-[var(--color-win)] bg-[var(--color-win)]/10 text-[var(--color-win)]'
                      : 'border-[var(--color-loss)] bg-[var(--color-loss)]/10 text-[var(--color-loss)]'
                    : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50'
                )}
              >
                <p className="text-lg font-black">{s.a} - {s.b}</p>
                <p className="text-xs mt-0.5">{iWon ? '勝利' : '敗北'}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 確認 & 送信 */}
      {canSubmit && (
        <Card className="border-[var(--color-primary)]/20 bg-[var(--color-neon-dim)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[var(--color-primary)]" />
              入力内容
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>相手: <span className="font-semibold">{opponents.find(o => o.user_id === opponentId)?.nickname}</span></p>
            <p>形式: <span className="font-semibold">{format === 'best_of_5' ? '5ゲーム制' : '3ゲーム制'}</span></p>
            <p>スコア: <span className="font-semibold">{score?.a} - {score?.b}</span>
              <span className={`ml-2 font-bold ${winnerId === userId ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}`}>
                ({winnerId === userId ? '勝利' : '敗北'})
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={!canSubmit || loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        承認依頼を送る
      </Button>
    </form>
  );
}
