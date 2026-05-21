'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setActiveGroup } from '@/app/actions/groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FadeInUp, StaggerList, StaggerItem } from '@/components/ui/motion';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, LogIn, Check, ChevronRight, Users, ArrowLeft } from 'lucide-react';
import type { MemberRole, InitialRatingLabel } from '@/types/database';

type View = 'list' | 'join' | 'create' | 'rating';

interface GroupItem {
  group_id: string;
  role: MemberRole;
  name: string;
  slug: string;
}

interface Props {
  groups: GroupItem[];
  activeGroupId: string | null;
  userId: string;
}

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
};

export function GroupManager({ groups, activeGroupId, userId }: Props) {
  const router = useRouter();
  const [view, setView]           = useState<View>('list');
  const [loading, setLoading]     = useState(false);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);

  // グループ参加フォーム
  const [joinSlug, setJoinSlug]   = useState('');

  // グループ作成フォーム
  const [groupName, setGroupName] = useState('');
  const [groupSlug, setGroupSlug] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // 初期レートラベル
  const [labels, setLabels]               = useState<InitialRatingLabel[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  // ─── グループ切り替え ───
  async function handleSwitch(groupId: string) {
    setLoading(true);
    const result = await setActiveGroup(groupId);
    setLoading(false);
    if (result.error) {
      toast({ title: 'エラー', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'グループを切り替えました', variant: 'success' });
    router.push('/');
    router.refresh();
  }

  // ─── 招待コードで参加 ───
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id, name, slug')
        .eq('slug', joinSlug.trim())
        .single();
      if (groupError || !group) throw new Error('グループが見つかりません');

      // すでに参加済みかチェック
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('user_id', userId)
        .eq('group_id', group.id)
        .single();

      if (!existing) {
        const { error: memberError } = await supabase.from('group_members').insert({
          group_id: group.id,
          user_id: userId,
          role: 'member',
          status: 'active',
          joined_at: new Date().toISOString(),
        });
        if (memberError) throw memberError;
      }

      // player_ratings が存在するかチェック
      const { data: rating } = await supabase
        .from('player_ratings')
        .select('id')
        .eq('user_id', userId)
        .eq('group_id', group.id)
        .single();

      if (rating) {
        // すでにレートがある → そのまま切り替え
        await setActiveGroup(group.id);
        toast({ title: `${group.name} に参加しました`, variant: 'success' });
        router.push('/');
        router.refresh();
        return;
      }

      // レートがない → 初期レート選択へ
      setNewGroupId(group.id);
      await loadLabels(group.id);
      setView('rating');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // ─── グループ作成 ───
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: groupName.trim(), slug: groupSlug.trim(), description: groupDesc.trim() || null, created_by: userId })
        .select()
        .single();
      if (groupError) throw groupError;

      await supabase.from('group_members').insert({
        group_id: group.id, user_id: userId, role: 'owner', status: 'active', joined_at: new Date().toISOString(),
      });

      await supabase.from('group_rating_settings').insert({ group_id: group.id });

      await supabase.from('initial_rating_labels').insert([
        { group_id: group.id, label: '未経験・初心者', description: 'ラケットを初めて握る方', initial_rating: 1000, sort_order: 1 },
        { group_id: group.id, label: '大学始め',       description: '大学から卓球を始めた方', initial_rating: 1150, sort_order: 2 },
        { group_id: group.id, label: '中学経験者',     description: '中学で部活経験がある方', initial_rating: 1300, sort_order: 3 },
        { group_id: group.id, label: '高校経験者',     description: '高校で部活経験がある方', initial_rating: 1450, sort_order: 4 },
        { group_id: group.id, label: '大会経験者',     description: '各種大会に出場経験がある方', initial_rating: 1600, sort_order: 5 },
        { group_id: group.id, label: '上級者',         description: '全国・県上位レベル',     initial_rating: 1750, sort_order: 6 },
      ]);

      setNewGroupId(group.id);
      await loadLabels(group.id);
      setView('rating');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // ─── 初期レートラベル読み込み ───
  async function loadLabels(gid: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('initial_rating_labels')
      .select('*')
      .eq('group_id', gid)
      .eq('is_active', true)
      .order('sort_order');
    if (data) setLabels(data);
  }

  // ─── 初期レート確定 ───
  async function handleLabelSelect() {
    if (!selectedLabelId || !newGroupId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const label = labels.find(l => l.id === selectedLabelId);
      if (!label) throw new Error('ラベルが見つかりません');

      await supabase.from('player_ratings').insert({
        group_id: newGroupId,
        user_id: userId,
        rating: label.initial_rating,
        initial_rating: label.initial_rating,
        initial_rating_label_id: label.id,
        wins: 0, losses: 0, approved_match_count: 0, current_streak: 0,
        highest_rating: label.initial_rating,
        lowest_rating: label.initial_rating,
      });

      await setActiveGroup(newGroupId);
      toast({ title: 'セットアップ完了！', variant: 'success' });
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // ─── 参加中グループ一覧 ───
  if (view === 'list') {
    return (
      <div className="space-y-5">
        {/* 参加中グループ */}
        <FadeInUp delay={0}>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest px-1">
              参加中のグループ
            </p>
            {groups.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] py-4 text-center">グループに参加していません</p>
            ) : (
              <StaggerList className="space-y-2">
                {groups.map(g => {
                  const isActive = g.group_id === activeGroupId;
                  return (
                    <StaggerItem key={g.group_id}>
                      <div className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${
                        isActive
                          ? 'border-[var(--color-primary)]/40 bg-[var(--color-neon-dim)]'
                          : 'border-[var(--color-border)] bg-[var(--color-card)]'
                      }`}>
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-card-elevated)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold truncate">{g.name}</p>
                            {isActive && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 shrink-0">
                                アクティブ
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
                            {ROLE_LABEL[g.role]} · {g.slug}
                          </p>
                        </div>
                        {isActive ? (
                          <Check className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => handleSwitch(g.group_id)}
                            className="shrink-0 text-xs"
                          >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : '切り替える'}
                          </Button>
                        )}
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerList>
            )}
          </div>
        </FadeInUp>

        {/* アクション */}
        <FadeInUp delay={0.1}>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest px-1">
              別のグループ
            </p>
            <button
              onClick={() => setView('join')}
              className="w-full p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-neon-dim)] transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-card-elevated)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                <LogIn className="h-4 w-4 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] transition-colors" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold group-hover:text-[var(--color-primary)] transition-colors">招待コードで参加する</p>
                <p className="text-[10px] text-[var(--color-muted-foreground)]">既存グループに入る</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
            </button>
            <button
              onClick={() => setView('create')}
              className="w-full p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-neon-dim)] transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-card-elevated)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] transition-colors" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold group-hover:text-[var(--color-primary)] transition-colors">新しいグループを作成する</p>
                <p className="text-[10px] text-[var(--color-muted-foreground)]">部活・サークルを新規登録</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
            </button>
          </div>
        </FadeInUp>
      </div>
    );
  }

  // ─── 招待コードで参加 ───
  if (view === 'join') {
    return (
      <FadeInUp>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 戻る
          </button>
          <h2 className="text-base font-bold">招待コードで参加</h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="join-slug">招待コード</Label>
              <Input
                id="join-slug"
                placeholder="例: xxxxuniv-tt"
                value={joinSlug}
                onChange={e => setJoinSlug(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !joinSlug.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              参加する
            </Button>
          </form>
        </div>
      </FadeInUp>
    );
  }

  // ─── グループ作成 ───
  if (view === 'create') {
    return (
      <FadeInUp>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 戻る
          </button>
          <h2 className="text-base font-bold">グループを作成</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="g-name">グループ名</Label>
              <Input id="g-name" placeholder="例: ○○大学卓球部" value={groupName} onChange={e => setGroupName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-slug">招待コード（英数字・ハイフン）</Label>
              <Input
                id="g-slug"
                placeholder="例: xxxxuniv-tt"
                value={groupSlug}
                onChange={e => setGroupSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
              />
              <p className="text-[10px] text-[var(--color-muted-foreground)]">メンバーがこのコードで参加します</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-desc">説明（任意）</Label>
              <Input id="g-desc" placeholder="グループの説明" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !groupName.trim() || !groupSlug.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              作成する
            </Button>
          </form>
        </div>
      </FadeInUp>
    );
  }

  // ─── 初期レート選択 ───
  return (
    <FadeInUp>
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-base font-bold mb-1">経験レベルを選んでください</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">このグループでの初期レートが決まります</p>
        </div>
        <div className="space-y-2">
          {labels.map(label => (
            <button
              key={label.id}
              onClick={() => setSelectedLabelId(label.id)}
              className={`w-full p-4 rounded-xl border transition-all text-left ${
                selectedLabelId === label.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-neon-dim)]'
                  : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{label.label}</p>
                  {label.description && <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{label.description}</p>}
                </div>
                <Badge variant="default" className="font-mono shrink-0">{label.initial_rating}</Badge>
              </div>
            </button>
          ))}
        </div>
        <Button onClick={handleLabelSelect} className="w-full" disabled={!selectedLabelId || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          この経験レベルで始める
        </Button>
      </div>
    </FadeInUp>
  );
}
