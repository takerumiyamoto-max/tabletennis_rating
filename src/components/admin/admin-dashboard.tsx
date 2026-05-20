'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Users, Clock, Settings, Tag, XCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { MemberRole, GroupRatingSettings, InitialRatingLabel } from '@/types/database';

interface Props {
  groupId: string;
  group: { name: string; slug: string; description: string | null };
  myRole: MemberRole;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingMatches: any[];
  ratingSettings: GroupRatingSettings | null;
  labels: InitialRatingLabel[];
  currentUserId: string;
}

export function AdminDashboard({ groupId, group, myRole, members, pendingMatches, ratingSettings, labels, currentUserId }: Props) {
  const [loading, setLoading] = useState(false);

  async function cancelMatch(matchId: string) {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.from('matches').update({
        status: 'cancelled',
        cancelled_by: currentUserId,
        cancelled_at: new Date().toISOString(),
      }).eq('id', matchId);
      toast({ title: '試合をキャンセルしました', variant: 'success' });
    } catch {
      toast({ title: 'エラー', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId: string, role: MemberRole) {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.from('group_members').update({ role }).eq('group_id', groupId).eq('user_id', userId);
      toast({ title: '権限を変更しました', variant: 'success' });
    } catch {
      toast({ title: 'エラー', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const roleLabel: Record<MemberRole, string> = { owner: 'オーナー', admin: '管理者', member: 'メンバー' };

  return (
    <Tabs defaultValue="members">
      <TabsList className="w-full mb-5 grid grid-cols-4">
        <TabsTrigger value="members" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" />メンバー</TabsTrigger>
        <TabsTrigger value="pending" className="text-xs relative">
          <Clock className="h-3.5 w-3.5 mr-1" />承認待ち
          {pendingMatches.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--color-provisional)] text-black rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              {pendingMatches.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="labels" className="text-xs"><Tag className="h-3.5 w-3.5 mr-1" />ラベル</TabsTrigger>
        <TabsTrigger value="settings" className="text-xs"><Settings className="h-3.5 w-3.5 mr-1" />設定</TabsTrigger>
      </TabsList>

      {/* メンバー管理 */}
      <TabsContent value="members" className="space-y-2">
        <p className="text-xs text-[var(--color-muted-foreground)] mb-3">{members.length}名のメンバー</p>
        {members.map((m) => {
          const profile = m.profiles;
          const pr = m.player_ratings?.[0] ?? m.player_ratings;
          return (
            <Card key={m.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{profile?.nickname?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{profile?.nickname ?? '?'}</p>
                      <Badge variant={m.role === 'owner' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {roleLabel[m.role as MemberRole]}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {pr ? `${Math.round(Number(pr.rating || pr?.[0]?.rating || 0))} pt · ${pr.wins || pr?.[0]?.wins || 0}勝` : 'レートなし'}
                    </p>
                  </div>
                  {myRole === 'owner' && m.user_id !== currentUserId && (
                    <div className="flex gap-1">
                      {m.role !== 'admin' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => changeRole(m.user_id, 'admin')} disabled={loading}>
                          <ShieldCheck className="h-3 w-3 mr-0.5" />管理者に
                        </Button>
                      )}
                      {m.role === 'admin' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => changeRole(m.user_id, 'member')} disabled={loading}>
                          メンバーに
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>

      {/* 承認待ち試合 */}
      <TabsContent value="pending" className="space-y-2">
        {pendingMatches.length === 0 ? (
          <p className="text-center text-[var(--color-muted-foreground)] text-sm py-8">承認待ちの試合はありません</p>
        ) : (
          pendingMatches.map((m) => {
            const pA = m['profiles!matches_player_a_id_fkey'];
            const pB = m['profiles!matches_player_b_id_fkey'];
            return (
              <Card key={m.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {pA?.nickname ?? '?'} vs {pB?.nickname ?? '?'}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {m.player_a_sets} - {m.player_b_sets} · {formatDateTime(m.created_at)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs shrink-0"
                      onClick={() => cancelMatch(m.id)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-0.5" />}
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </TabsContent>

      {/* 初期レートラベル */}
      <TabsContent value="labels" className="space-y-2">
        <p className="text-xs text-[var(--color-muted-foreground)] mb-2">
          参加時に選択される初期レートラベル。変更しても既存参加者のレートには影響しません。
        </p>
        {labels.map((label) => (
          <Card key={label.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{label.label}</p>
                  {label.description && <p className="text-xs text-[var(--color-muted-foreground)]">{label.description}</p>}
                </div>
                <Badge variant="default" className="font-mono">{label.initial_rating}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* グループ設定 */}
      <TabsContent value="settings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">グループ情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">グループ名</span>
              <span className="font-medium">{group.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">招待コード</span>
              <span className="font-mono font-medium text-[var(--color-primary)]">{group.slug}</span>
            </div>
          </CardContent>
        </Card>

        {ratingSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">レート設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['K値 (0-9試合)', ratingSettings.k_new],
                ['K値 (10-29試合)', ratingSettings.k_normal],
                ['K値 (30試合+)', ratingSettings.k_stable],
                ['Eloスケール', ratingSettings.elo_scale],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">{label}</span>
                  <span className="font-mono font-medium">{val}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
