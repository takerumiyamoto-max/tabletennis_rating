'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Pencil, Check } from 'lucide-react';
import type { Profile } from '@/types/database';

interface Props {
  profile: Profile;
}

export function ProfileEditForm({ profile }: Props) {
  const [editing, setEditing]     = useState(false);
  const [nickname, setNickname]   = useState(profile.nickname);
  const [loading, setLoading]     = useState(false);

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

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-xl">{profile.nickname[0]}</AvatarFallback>
          </Avatar>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
