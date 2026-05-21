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
import {
  Users, Clock, Settings, Tag, XCircle, ShieldCheck,
  Loader2, Plus, Pencil, Save, X, Power, UserMinus,
} from 'lucide-react';
import { removeMember } from '@/app/actions/groups';
import { formatDateTime } from '@/lib/utils';
import type { MemberRole, GroupRatingSettings, InitialRatingLabel } from '@/types/database';

// ─── 型 ──────────────────────────────────────────────────────

interface LabelForm {
  label: string;
  description: string;
  initial_rating: string;
  sort_order: string;
  is_active: boolean;
}

interface SettingsForm {
  elo_scale: string;
  k_new: string;
  k_normal: string;
  k_stable: string;
  new_until_matches: string;
  stable_from_matches: string;
  best_of_3_straight_multiplier: string;
  best_of_3_full_multiplier: string;
  best_of_5_straight_multiplier: string;
  best_of_5_four_game_multiplier: string;
  best_of_5_full_multiplier: string;
}

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

const EMPTY_LABEL: LabelForm = {
  label: '', description: '', initial_rating: '1000', sort_order: '0', is_active: true,
};

function toSettingsForm(s: GroupRatingSettings | null): SettingsForm {
  return {
    elo_scale:                      String(s?.elo_scale                      ?? 400),
    k_new:                          String(s?.k_new                          ?? 48),
    k_normal:                       String(s?.k_normal                       ?? 32),
    k_stable:                       String(s?.k_stable                       ?? 24),
    new_until_matches:              String(s?.new_until_matches              ?? 10),
    stable_from_matches:            String(s?.stable_from_matches            ?? 30),
    best_of_3_straight_multiplier:  String(s?.best_of_3_straight_multiplier  ?? 1.15),
    best_of_3_full_multiplier:      String(s?.best_of_3_full_multiplier      ?? 1.00),
    best_of_5_straight_multiplier:  String(s?.best_of_5_straight_multiplier  ?? 1.25),
    best_of_5_four_game_multiplier: String(s?.best_of_5_four_game_multiplier ?? 1.10),
    best_of_5_full_multiplier:      String(s?.best_of_5_full_multiplier      ?? 1.00),
  };
}

// ─── コンポーネント ───────────────────────────────────────────

export function AdminDashboard({
  groupId, group, myRole, members, pendingMatches,
  ratingSettings: initialSettings, labels: initialLabels, currentUserId,
}: Props) {
  // 汎用ローディング（メンバー操作・試合キャンセル）
  const [loading, setLoading] = useState(false);

  // ラベル
  const [labels, setLabels]             = useState<InitialRatingLabel[]>(initialLabels);
  const [editingId, setEditingId]       = useState<string | null>(null); // 'new' or label.id
  const [labelForm, setLabelForm]       = useState<LabelForm>(EMPTY_LABEL);
  const [labelLoading, setLabelLoading] = useState(false);

  // レート設定
  const [settingsForm, setSettingsForm]     = useState<SettingsForm>(() => toSettingsForm(initialSettings));
  const [settingsLoading, setSettingsLoading] = useState(false);

  const roleLabel: Record<MemberRole, string> = { owner: 'オーナー', admin: '管理者', member: 'メンバー' };

  // ─── メンバー操作 ───────────────────────────────────────────

  async function cancelMatch(matchId: string) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('matches').update({
        status: 'cancelled',
        cancelled_by: currentUserId,
        cancelled_at: new Date().toISOString(),
      }).eq('id', matchId);
      if (error) throw error;
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
      const { error } = await supabase
        .from('group_members').update({ role })
        .eq('group_id', groupId).eq('user_id', userId);
      if (error) throw error;
      toast({ title: '権限を変更しました', variant: 'success' });
    } catch {
      toast({ title: 'エラー', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(userId: string, nickname: string) {
    if (!confirm(`${nickname} をグループから削除しますか？`)) return;
    setLoading(true);
    try {
      const result = await removeMember(groupId, userId);
      if (result.error) throw new Error(result.error);
      toast({ title: `${nickname} を削除しました`, variant: 'success' });
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // ─── ラベル操作 ─────────────────────────────────────────────

  function startEdit(label: InitialRatingLabel) {
    setEditingId(label.id);
    setLabelForm({
      label: label.label,
      description: label.description ?? '',
      initial_rating: String(label.initial_rating),
      sort_order: String(label.sort_order),
      is_active: label.is_active,
    });
  }

  function startAdd() {
    setEditingId('new');
    setLabelForm({ ...EMPTY_LABEL, sort_order: String(labels.length + 1) });
  }

  function cancelEdit() { setEditingId(null); }

  async function handleSaveLabel() {
    const initial_rating = parseInt(labelForm.initial_rating);
    const sort_order     = parseInt(labelForm.sort_order);
    if (!labelForm.label.trim() || isNaN(initial_rating) || initial_rating < 0) {
      toast({ title: 'ラベル名と初期レートは必須です', variant: 'destructive' });
      return;
    }
    setLabelLoading(true);
    try {
      const supabase = createClient();
      const payload = {
        label:          labelForm.label.trim(),
        description:    labelForm.description.trim() || null,
        initial_rating,
        sort_order:     isNaN(sort_order) ? 0 : sort_order,
        is_active:      labelForm.is_active,
      };
      if (editingId === 'new') {
        const { data, error } = await supabase
          .from('initial_rating_labels')
          .insert({ group_id: groupId, ...payload })
          .select()
          .single();
        if (error) throw error;
        setLabels(prev =>
          [...prev, data as unknown as InitialRatingLabel]
            .sort((a, b) => a.sort_order - b.sort_order)
        );
      } else {
        const { error } = await supabase
          .from('initial_rating_labels')
          .update(payload)
          .eq('id', editingId!);
        if (error) throw error;
        setLabels(prev =>
          prev.map(l => l.id === editingId ? { ...l, ...payload } : l)
            .sort((a, b) => a.sort_order - b.sort_order)
        );
      }
      toast({ title: 'ラベルを保存しました', variant: 'success' });
      setEditingId(null);
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLabelLoading(false);
    }
  }

  async function toggleActive(label: InitialRatingLabel) {
    setLabelLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('initial_rating_labels')
        .update({ is_active: !label.is_active })
        .eq('id', label.id);
      if (error) throw error;
      setLabels(prev => prev.map(l => l.id === label.id ? { ...l, is_active: !l.is_active } : l));
      toast({ title: label.is_active ? '無効にしました' : '有効にしました', variant: 'success' });
    } catch {
      toast({ title: 'エラー', variant: 'destructive' });
    } finally {
      setLabelLoading(false);
    }
  }

  // ─── レート設定保存 ─────────────────────────────────────────

  async function handleSaveSettings() {
    setSettingsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('group_rating_settings')
        .update({
          elo_scale:                      parseInt(settingsForm.elo_scale),
          k_new:                          parseInt(settingsForm.k_new),
          k_normal:                       parseInt(settingsForm.k_normal),
          k_stable:                       parseInt(settingsForm.k_stable),
          new_until_matches:              parseInt(settingsForm.new_until_matches),
          stable_from_matches:            parseInt(settingsForm.stable_from_matches),
          best_of_3_straight_multiplier:  parseFloat(settingsForm.best_of_3_straight_multiplier),
          best_of_3_full_multiplier:      parseFloat(settingsForm.best_of_3_full_multiplier),
          best_of_5_straight_multiplier:  parseFloat(settingsForm.best_of_5_straight_multiplier),
          best_of_5_four_game_multiplier: parseFloat(settingsForm.best_of_5_four_game_multiplier),
          best_of_5_full_multiplier:      parseFloat(settingsForm.best_of_5_full_multiplier),
        })
        .eq('group_id', groupId);
      if (error) throw error;
      toast({ title: 'レート設定を保存しました', variant: 'success' });
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setSettingsLoading(false);
    }
  }

  // ─── ラベルフォーム JSX ─────────────────────────────────────

  const labelFormJsx = (
    <Card className="border-[var(--color-primary)]/40">
      <CardContent className="pt-3 pb-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">
              ラベル名 <span className="text-[var(--color-loss)]">*</span>
            </Label>
            <Input
              value={labelForm.label}
              onChange={e => setLabelForm(f => ({ ...f, label: e.target.value }))}
              placeholder="例: 高校経験者"
              className="h-8 text-sm"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">説明（任意）</Label>
            <Input
              value={labelForm.description}
              onChange={e => setLabelForm(f => ({ ...f, description: e.target.value }))}
              placeholder="例: 高校で部活経験がある方"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              初期レート <span className="text-[var(--color-loss)]">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={labelForm.initial_rating}
              onChange={e => setLabelForm(f => ({ ...f, initial_rating: e.target.value }))}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">表示順</Label>
            <Input
              type="number"
              min="0"
              value={labelForm.sort_order}
              onChange={e => setLabelForm(f => ({ ...f, sort_order: e.target.value }))}
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLabelForm(f => ({ ...f, is_active: !f.is_active }))}
          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
            labelForm.is_active
              ? 'border-[var(--color-win)] text-[var(--color-win)]'
              : 'border-[var(--color-muted-foreground)] text-[var(--color-muted-foreground)]'
          }`}
        >
          {labelForm.is_active ? '有効' : '無効'}（クリックで切り替え）
        </button>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="flex-1 h-8" onClick={cancelEdit}>
            <X className="h-3.5 w-3.5 mr-1" />キャンセル
          </Button>
          <Button type="button" size="sm" className="flex-1 h-8" onClick={handleSaveLabel} disabled={labelLoading}>
            {labelLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              : <Save className="h-3.5 w-3.5 mr-1" />
            }
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // ─── render ─────────────────────────────────────────────────

  return (
    <Tabs defaultValue="members">
      <TabsList className="w-full mb-5 grid grid-cols-4">
        <TabsTrigger value="members"  className="text-xs"><Users   className="h-3.5 w-3.5 mr-1" />メンバー</TabsTrigger>
        <TabsTrigger value="pending"  className="text-xs relative">
          <Clock className="h-3.5 w-3.5 mr-1" />承認待ち
          {pendingMatches.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--color-provisional)] text-black rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              {pendingMatches.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="labels"   className="text-xs"><Tag      className="h-3.5 w-3.5 mr-1" />ラベル</TabsTrigger>
        <TabsTrigger value="settings" className="text-xs"><Settings className="h-3.5 w-3.5 mr-1" />設定</TabsTrigger>
      </TabsList>

      {/* ── メンバー ── */}
      <TabsContent value="members" className="space-y-2">
        <p className="text-xs text-[var(--color-muted-foreground)] mb-3">{members.length}名のメンバー</p>
        {members.map((m) => {
          const profile = m.profiles;
          const pr      = Array.isArray(m.player_ratings) ? m.player_ratings[0] : m.player_ratings;
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
                      {pr ? `${Math.round(Number(pr.rating ?? 0))} pt · ${pr.wins ?? 0}勝` : 'レートなし'}
                    </p>
                  </div>
                  {(myRole === 'owner' || myRole === 'admin') && m.user_id !== currentUserId && m.role !== 'owner' && (
                    <div className="flex gap-1 shrink-0">
                      {myRole === 'owner' && m.role !== 'admin' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => changeRole(m.user_id, 'admin')} disabled={loading}>
                          <ShieldCheck className="h-3 w-3 mr-0.5" />管理者に
                        </Button>
                      )}
                      {myRole === 'owner' && m.role === 'admin' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => changeRole(m.user_id, 'member')} disabled={loading}>
                          メンバーに
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 text-[var(--color-loss)] hover:text-[var(--color-loss)] hover:border-[var(--color-loss)]/50"
                        onClick={() => handleRemoveMember(m.user_id, m.profiles?.nickname ?? '?')}
                        disabled={loading}
                      >
                        <UserMinus className="h-3 w-3 mr-0.5" />削除
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>

      {/* ── 承認待ち ── */}
      <TabsContent value="pending" className="space-y-2">
        {pendingMatches.length === 0 ? (
          <p className="text-center text-[var(--color-muted-foreground)] text-sm py-8">承認待ちの試合はありません</p>
        ) : pendingMatches.map((m) => {
          const pA = m['profiles!matches_player_a_id_fkey'];
          const pB = m['profiles!matches_player_b_id_fkey'];
          return (
            <Card key={m.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{pA?.nickname ?? '?'} vs {pB?.nickname ?? '?'}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {m.player_a_sets} - {m.player_b_sets} · {formatDateTime(m.created_at)}
                    </p>
                  </div>
                  <Button size="sm" variant="destructive" className="h-7 text-xs shrink-0" onClick={() => cancelMatch(m.id)} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-0.5" />}
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>

      {/* ── ラベル編集 ── */}
      <TabsContent value="labels" className="space-y-2">
        <p className="text-xs text-[var(--color-muted-foreground)] mb-2">
          参加時に選択される初期レートラベル。変更しても既存参加者のレートには影響しません。
        </p>
        {labels.map((label) =>
          editingId === label.id ? (
            <div key={label.id}>{labelFormJsx}</div>
          ) : (
            <Card key={label.id} className={!label.is_active ? 'opacity-50' : ''}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold">{label.label}</p>
                      {!label.is_active && <Badge variant="secondary" className="text-[10px]">無効</Badge>}
                    </div>
                    {label.description && (
                      <p className="text-xs text-[var(--color-muted-foreground)]">{label.description}</p>
                    )}
                  </div>
                  <Badge variant="default" className="font-mono shrink-0">{label.initial_rating}</Badge>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon-sm" variant="outline" className="h-7 w-7"
                      onClick={() => startEdit(label)}
                      disabled={labelLoading || editingId !== null}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon-sm" variant="outline"
                      className={`h-7 w-7 ${label.is_active ? 'text-[var(--color-win)]' : 'text-[var(--color-muted-foreground)]'}`}
                      onClick={() => toggleActive(label)}
                      disabled={labelLoading || editingId !== null}
                      title={label.is_active ? '無効にする' : '有効にする'}
                    >
                      <Power className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        )}
        {editingId === 'new' && labelFormJsx}
        {editingId === null && (
          <Button type="button" variant="outline" className="w-full mt-1" onClick={startAdd}>
            <Plus className="h-4 w-4 mr-2" />ラベルを追加
          </Button>
        )}
      </TabsContent>

      {/* ── レート設定編集 ── */}
      <TabsContent value="settings" className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">グループ情報</CardTitle></CardHeader>
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

        {/* K値・閾値 */}
        <Card>
          <CardHeader><CardTitle className="text-sm">K値 / 試合数設定</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {([
              ['k_new',              'K値（0〜9試合）'],
              ['k_normal',           'K値（10〜29試合）'],
              ['k_stable',           'K値（30試合+）'],
              ['elo_scale',          'Eloスケール'],
              ['new_until_matches',  'プロビジョナル上限試合数'],
              ['stable_from_matches','安定K開始試合数'],
            ] as const).map(([key, lbl]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <Label className="text-xs text-[var(--color-muted-foreground)] flex-1">{lbl}</Label>
                <Input
                  type="number"
                  min="0"
                  value={settingsForm[key]}
                  onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
                  className="h-8 text-sm font-mono w-24 text-right"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* セット補正 */}
        <Card>
          <CardHeader><CardTitle className="text-sm">セット補正（M値）</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {([
              ['best_of_3_straight_multiplier',  '3本勝負 2-0'],
              ['best_of_3_full_multiplier',       '3本勝負 2-1'],
              ['best_of_5_straight_multiplier',  '5本勝負 3-0'],
              ['best_of_5_four_game_multiplier', '5本勝負 3-1'],
              ['best_of_5_full_multiplier',       '5本勝負 3-2'],
            ] as const).map(([key, lbl]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <Label className="text-xs text-[var(--color-muted-foreground)] flex-1">{lbl}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.05"
                  value={settingsForm[key]}
                  onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
                  className="h-8 text-sm font-mono w-24 text-right"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button onClick={handleSaveSettings} disabled={settingsLoading} className="w-full">
          {settingsLoading
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <Save className="h-4 w-4 mr-2" />
          }
          設定を保存
        </Button>
      </TabsContent>
    </Tabs>
  );
}
