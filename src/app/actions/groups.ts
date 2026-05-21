'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function setActiveGroup(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '未認証' };

  // 所属確認（所属していないグループには切り替えられない）
  const { data: member } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('group_id', groupId)
    .eq('status', 'active')
    .single();

  if (!member) return { error: 'このグループのメンバーではありません' };

  const { error } = await supabase
    .from('profiles')
    .update({ active_group_id: groupId })
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return {};
}
