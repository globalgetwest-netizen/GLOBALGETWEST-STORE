// lib/staff/guard.ts
import { redirect } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function requireStaff() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/account/sign-in?next=/staff');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, full_name, department')
    .eq('id', user.id)
    .single();

  // Admins can also access the staff portal (superset of permissions);
  // plain customers cannot.
  if (!profile || !profile.is_active || (profile.role !== 'staff' && profile.role !== 'admin')) {
    redirect('/account');
  }

  return { supabase, user, profile };
}
