import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/shared/bottom-nav';
import { Toaster } from '@/components/ui/toaster';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // プロフィール未作成 → オンボーディングへ
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/onboarding');

  // グループ未所属 → オンボーディングへ
  const { data: member } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!member) redirect('/onboarding');

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 pb-safe overflow-y-auto">
        {children}
      </main>
      <BottomNav />
      <Toaster />
    </div>
  );
}
