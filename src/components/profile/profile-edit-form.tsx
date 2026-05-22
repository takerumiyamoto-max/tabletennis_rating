'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FadeInUp } from '@/components/ui/motion';
import { toast } from '@/hooks/use-toast';
import { Loader2, Pencil, Check, Camera } from 'lucide-react';
import { BadgeStrip } from '@/components/badges/badge-strip';
import type { Profile, BadgeDefinition } from '@/types/database';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  profile: Profile;
  rating?: number;
  rank?: number;
  isProvisional?: boolean;
  allBadges?: BadgeDefinition[];
  unlockedBadgeIds?: string[];
}

export function ProfileEditForm({ profile, rating, rank, isProvisional, allBadges, unlockedBadgeIds }: Props) {
  const [editing, setEditing]     = useState(false);
  const [nickname, setNickname]   = useState(profile.nickname);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  async function handleSave() {
    if (!nickname.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim() })
        .eq('user_id', profile.user_id);
      if (error) throw error;
      toast({ title: '更新しました', variant: 'success' });
      setEditing(false);
    } catch (err: unknown) {
      toast({ title: 'エラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: '対応していない形式です', description: 'JPEG / PNG / WebP を選択してください', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'ファイルが大きすぎます', description: '2MB 以下の画像を選択してください', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
      const path = `${profile.user_id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', profile.user_id);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({ title: 'アバターを更新しました', variant: 'success' });
    } catch (err: unknown) {
      toast({ title: 'アップロードエラー', description: err instanceof Error ? err.message : '失敗しました', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <FadeInUp>
      <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-card">
        {/* 背景バナー */}
        <div
          className="h-24 relative"
          style={{ background: 'linear-gradient(135deg, #0f2240 0%, #0a1628 40%, #0d1f38 100%)' }}
        >
          <div className="absolute inset-0 bg-[var(--color-primary)]/5" />
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--color-primary)]/10 blur-2xl" />
          <div className="absolute top-2 right-3 text-[10px] text-[var(--color-muted-foreground)]/60 font-mono uppercase tracking-widest">
            PLAYER PROFILE
          </div>
        </div>

        {/* アバター (バナーにオーバーラップ) */}
        <div className="px-5 pb-5 bg-[var(--color-card)]">
          <div className="-mt-10 flex items-end justify-between mb-4">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-[var(--color-card)] shadow-card">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-2xl font-black">{profile.nickname[0]}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="アバター画像を変更"
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-lg hover:bg-[var(--color-primary)]/85 transition-colors disabled:opacity-50"
              >
                {uploading
                  ? <Loader2 className="h-3.5 w-3.5 text-[var(--color-primary-foreground)] animate-spin" />
                  : <Camera className="h-3.5 w-3.5 text-[var(--color-primary-foreground)]" />
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* レート/順位チップ (props があれば表示) */}
            {rating !== undefined && rank !== undefined && (
              <div className="flex items-center gap-2 pb-1">
                <div className="px-3 py-1.5 rounded-xl bg-[var(--color-card-elevated)] border border-[var(--color-border)] text-center">
                  <p className="text-[10px] text-[var(--color-muted-foreground)] leading-none mb-0.5">RATING</p>
                  <p className="text-lg font-black neon-text tabular-nums leading-none">{Math.round(rating)}</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[var(--color-card-elevated)] border border-[var(--color-border)] text-center">
                  <p className="text-[10px] text-[var(--color-muted-foreground)] leading-none mb-0.5">RANK</p>
                  <p className="text-lg font-black text-[var(--color-gold)] tabular-nums leading-none">#{rank}</p>
                </div>
                {isProvisional && (
                  <div className="px-2 py-1 rounded-lg bg-[var(--color-provisional)]/15 border border-[var(--color-provisional)]/30">
                    <p className="text-[10px] font-bold text-[var(--color-provisional)]">仮レート</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ニックネーム */}
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                className="h-9 text-base font-bold"
                autoFocus
              />
              <Button size="icon-sm" onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">{nickname}</h2>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1 font-mono">
            ID: {profile.user_id.slice(0, 12)}...
          </p>

          {allBadges && unlockedBadgeIds && (
            <BadgeStrip badges={allBadges} unlockedBadgeIds={unlockedBadgeIds} />
          )}
        </div>
      </div>
    </FadeInUp>
  );
}
