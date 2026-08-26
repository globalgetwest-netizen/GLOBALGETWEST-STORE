// lib/admin/guard.ts
// Every admin page and API route calls this first. It's a defense-in-depth
// layer on top of RLS — RLS stops the database query from succeeding for a
// non-admin, this stops the page from even rendering / the route from even
// running the query.
import { redirect } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';

// Admin and CEO share the admin portal — CEO is a superset of admin
// permissions (see migration 006), so this guard covers both. Use
// requireCeo() separately for CEO-only pages (e.g. managing admin accounts).
export async function requireAdmin() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/account/sign-in?next=/admin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'ceo') || !profile.is_active) {
    redirect('/account');
  }

  return { supabase, user, profile };
}

export async function requireCeo() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/account/sign-in?next=/admin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'ceo' || !profile.is_active) {
    redirect('/admin');
  }

  return { supabase, user, profile };
}
