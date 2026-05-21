import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser, getUserProfile, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import { GroupManager } from '@/components/profile/group-manager';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { MemberRole } from '@/types/database';

export default async function GroupsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const [profile, activeGroup] = await Promise.all([
    getUserProfile(user.id),
    getActiveGroupMember(user.id),
  ]);

  if (!profile) redirect('/onboarding');

  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, role, groups(id, name, slug)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  const groups = (memberships ?? []).map(m => {
    const g = m.groups as unknown as { id: string; name: string; slug: string } | null;
    return {
      group_id: m.group_id,
      role: m.role as MemberRole,
      name: g?.name ?? '?',
      slug: g?.slug ?? '',
    };
  });

  return (
    <div className="px-4 pt-6 pb-20 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/profile"
          className="w-8 h-8 rounded-lg bg-[var(--color-card-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">グループ管理</h1>
      </div>

      <GroupManager
        groups={groups}
        activeGroupId={activeGroup?.group_id ?? null}
        userId={user.id}
      />
    </div>
  );
}
