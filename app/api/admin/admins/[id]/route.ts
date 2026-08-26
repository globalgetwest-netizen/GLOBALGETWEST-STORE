// app/api/admin/admins/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: actingProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (actingProfile?.role !== 'ceo') {
    return NextResponse.json({ error: 'Only the CEO can manage admin accounts' }, { status: 403 });
  }

  const { data: target } = await supabase.from('profiles').select('role').eq('id', id).single();
  if (target?.role === 'ceo') {
    return NextResponse.json({ error: 'Cannot deactivate the CEO account' }, { status: 400 });
  }

  const body = await req.json();
  const { error } = await supabase.from('profiles').update(body).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
