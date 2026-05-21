import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getUserProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
});

export const getActiveGroupMember = cache(async (userId: string) => {
  const supabase = await createClient();

  // プロフィールの active_group_id を優先して使う (getUserProfile はキャッシュされる)
  const profile = await getUserProfile(userId);

  if (profile?.active_group_id) {
    const { data } = await supabase
      .from('group_members')
      .select('group_id, role, groups(name)')
      .eq('user_id', userId)
      .eq('group_id', profile.active_group_id)
      .eq('status', 'active')
      .single();
    if (data) return data;
  }

  // フォールバック: 最初に参加したグループ
  const { data } = await supabase
    .from('group_members')
    .select('group_id, role, groups(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();
  return data;
});
