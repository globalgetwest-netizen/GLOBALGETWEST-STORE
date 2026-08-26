// app/api/admin/admins/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Page-level guard already restricts this route's UI to CEO, but the real
  // boundary is RLS: the 'ceo manage all profiles' policy (migration 006)
  // is what actually stops a non-CEO caller of this route from succeeding —
  // this check just gives a clean error message instead of a raw DB error.
  const { data: actingProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (actingProfile?.role !== 'ceo') {
    return NextResponse.json({ error: 'Only the CEO can promote admins' }, { status: 403 });
  }

  const { email } = await req.json() as { email: string };

  const { data: target, error: lookupError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!target) {
    return NextResponse.json(
      { error: 'No account with that email — they need to sign up first' },
      { status: 404 },
    );
  }
  if (target.role === 'ceo') {
    return NextResponse.json({ error: 'This user is already the CEO' }, { status: 400 });
  }
  if (target.role === 'admin') {
    return NextResponse.json({ error: 'This user is already an admin' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', target.id)
    .select('id, full_name, email, role, is_active, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
