'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Pencil, Check, Camera } from 'lucide-react';
import type { Profile } from '@/types/database';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  profile: Profile;
}

export function ProfileEditForm({ profile }: Props) {
  const [editing, setEditing]       = useState(false);
  const [nickname, setNickname]     = useState(profile.nickname);
  const [loading, setLoading]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(profile.avatar_url);
  const fileInputRef                = useRef<HTMLInputElement>(null);

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
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-4">
          {/* アバター + アップロードボタン */}
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="text-xl">{profile.nickname[0]}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="アバター画像を変更"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-30 hover:opacity-100 active:opacity-100 transition-opacity disabled:cursor-not-allowed"
            >
              {uploading
                ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                : <Camera className="h-5 w-5 text-white" />
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

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button size="icon-sm" onClick={handleSave} disabled={loading}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold truncate">{profile.nickname}</p>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 truncate">
              {profile.user_id.slice(0, 8)}...
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors mt-1 disabled:opacity-50"
            >
              {uploading ? 'アップロード中...' : '画像を変更'}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
