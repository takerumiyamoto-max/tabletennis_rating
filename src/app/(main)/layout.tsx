import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser, getUserProfile, getActiveGroupMember } from '@/lib/supabase/cached-queries';
import { BottomNav } from '@/components/shared/bottom-nav';
import { Toaster } from '@/components/ui/toaster';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const [profile, member] = await Promise.all([
    getUserProfile(user.id),
    getActiveGroupMember(user.id),
  ]);

  if (!profile || !member) redirect('/onboarding');

  const supabase = await createClient();
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 pb-safe overflow-y-auto">
        {children}
      </main>
      <BottomNav unreadCount={unreadCount ?? 0} />
      <Toaster />
    </div>
  );
}
