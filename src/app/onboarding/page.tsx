'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Users, Plus, LogIn } from 'lucide-react';
import type { OnboardingStep, InitialRatingLabel } from '@/types/app';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]           = useState<OnboardingStep>('profile');
  const [nickname, setNickname]   = useState('');
  const [loading, setLoading]     = useState(false);

  // グループ作成
  const [groupName, setGroupName]   = useState('');
  const [groupSlug, setGroupSlug]   = useState('');
  const [groupDesc, setGroupDesc]   = useState('');

  // グループ参加
  const [joinSlug, setJoinSlug]     = useState('');

  // グループID (作成 or 参加後)
  const [groupId, setGroupId]       = useState<string | null>(null);

  // 初期レートラベル
  const [labels, setLabels]                   = useState<InitialRatingLabel[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  useEffect(() => {
    if (step === 'rating_label' && groupId) {
      loadLabels(groupId);
    }
  }, [step, groupId]);

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

  // Step 1: プロフィール作成
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未認証');

      const { error } = await supabase.from('profiles').upsert({
        user_id: user.id,
        nickname: nickname.trim(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setStep('group_choice');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // Step 3: グループ作成
  async function handleGroupCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未認証');

      // グループ作成
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: groupName.trim(), slug: groupSlug.trim(), description: groupDesc.trim() || null, created_by: user.id })
        .select()
        .single();
      if (groupError) throw groupError;

      // オーナーとしてメンバー追加
      await supabase.from('group_members').insert({
        group_id: group.id, user_id: user.id, role: 'owner', status: 'active', joined_at: new Date().toISOString(),
      });

      // デフォルトレート設定
      await supabase.from('group_rating_settings').insert({ group_id: group.id });

      // デフォルトラベル追加
      await supabase.from('initial_rating_labels').insert([
        { group_id: group.id, label: '未経験・初心者', description: 'ラケットを初めて握る方', initial_rating: 1000, sort_order: 1 },
        { group_id: group.id, label: '大学始め',       description: '大学から卓球を始めた方', initial_rating: 1150, sort_order: 2 },
        { group_id: group.id, label: '中学経験者',     description: '中学で部活経験がある方', initial_rating: 1300, sort_order: 3 },
        { group_id: group.id, label: '高校経験者',     description: '高校で部活経験がある方', initial_rating: 1450, sort_order: 4 },
        { group_id: group.id, label: '大会経験者',     description: '各種大会に出場経験がある方', initial_rating: 1600, sort_order: 5 },
        { group_id: group.id, label: '上級者',         description: '全国・県上位レベル',     initial_rating: 1750, sort_order: 6 },
      ]);

      setGroupId(group.id);
      setStep('rating_label');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // Step 4: グループ参加
  async function handleGroupJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未認証');

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('slug', joinSlug.trim())
        .single();
      if (groupError || !group) throw new Error('グループが見つかりません');

      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: group.id, user_id: user.id, role: 'member', status: 'active', joined_at: new Date().toISOString(),
      });
      if (memberError && !memberError.message.includes('duplicate')) throw memberError;

      setGroupId(group.id);
      setStep('rating_label');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // Step 5: 初期レートラベル選択
  async function handleLabelSelect() {
    if (!selectedLabelId || !groupId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未認証');

      const label = labels.find(l => l.id === selectedLabelId);
      if (!label) throw new Error('ラベルが見つかりません');

      await supabase.from('player_ratings').insert({
        group_id: groupId,
        user_id: user.id,
        rating: label.initial_rating,
        initial_rating: label.initial_rating,
        initial_rating_label_id: label.id,
        wins: 0,
        losses: 0,
        approved_match_count: 0,
        current_streak: 0,
        highest_rating: label.initial_rating,
        lowest_rating: label.initial_rating,
      });

      toast({ title: '完了', description: 'セットアップが完了しました！', variant: 'success' });
      router.push('/');
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🏓</span>
          <h1 className="text-2xl font-bold neon-text mt-2">セットアップ</h1>
          <p className="text-[var(--color-muted-foreground)] text-sm">
            {step === 'profile'      && 'プロフィールを設定'}
            {step === 'group_choice' && 'グループを選択'}
            {step === 'group_create' && 'グループを作成'}
            {step === 'group_join'   && 'グループに参加'}
            {step === 'rating_label' && '初期レートを選択'}
          </p>
        </div>

        {/* Step 1: プロフィール */}
        {step === 'profile' && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-[var(--color-primary)]" />ニックネーム</CardTitle>
              <CardDescription>ランキングに表示される名前を入力してください</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nickname">ニックネーム</Label>
                  <Input
                    id="nickname"
                    placeholder="例: 山田太郎"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                    maxLength={20}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !nickname.trim()}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  次へ
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: グループ選択 */}
        {step === 'group_choice' && (
          <div className="space-y-3 animate-slide-up">
            <button
              onClick={() => setStep('group_create')}
              className="w-full p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-secondary)] transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-neon-dim)] flex items-center justify-center">
                  <Plus className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="font-semibold group-hover:text-[var(--color-primary)] transition-colors">グループを作成する</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">新しい部活・サークルを登録</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setStep('group_join')}
              className="w-full p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-secondary)] transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-neon-dim)] flex items-center justify-center">
                  <LogIn className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="font-semibold group-hover:text-[var(--color-primary)] transition-colors">グループに参加する</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">招待コードでグループに入る</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step 3: グループ作成 */}
        {step === 'group_create' && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-[var(--color-primary)]" />グループ作成</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGroupCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gname">グループ名</Label>
                  <Input id="gname" placeholder="例: ○○大学卓球部" value={groupName} onChange={(e) => setGroupName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gslug">招待コード (英数字・ハイフン)</Label>
                  <Input id="gslug" placeholder="例: xxxxuniv-tt" value={groupSlug} onChange={(e) => setGroupSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required />
                  <p className="text-xs text-[var(--color-muted-foreground)]">メンバーがこのコードでグループに参加します</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gdesc">説明 (任意)</Label>
                  <Input id="gdesc" placeholder="グループの説明" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('group_choice')} className="flex-1">戻る</Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    作成
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: グループ参加 */}
        {step === 'group_join' && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LogIn className="h-5 w-5 text-[var(--color-primary)]" />グループ参加</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGroupJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jslug">招待コード</Label>
                  <Input id="jslug" placeholder="例: xxxxuniv-tt" value={joinSlug} onChange={(e) => setJoinSlug(e.target.value)} required />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('group_choice')} className="flex-1">戻る</Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    参加
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 5: 初期レートラベル選択 */}
        {step === 'rating_label' && (
          <div className="animate-slide-up space-y-4">
            <div className="text-center">
              <p className="text-[var(--color-muted-foreground)] text-sm">あなたの経験レベルに近いものを選んでください</p>
            </div>
            <div className="space-y-2">
              {labels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => setSelectedLabelId(label.id)}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    selectedLabelId === label.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-neon-dim)] neon-glow'
                      : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{label.label}</p>
                      {label.description && <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{label.description}</p>}
                    </div>
                    <Badge variant="default" className="font-mono">{label.initial_rating}</Badge>
                  </div>
                </button>
              ))}
            </div>
            <Button
              onClick={handleLabelSelect}
              className="w-full"
              disabled={!selectedLabelId || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              この経験レベルで始める
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
