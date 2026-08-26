// app/api/admin/staff/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { email, department, countryCode } = await req.json() as { email: string; department: string; countryCode: string | null };

  const { data: target, error: lookupError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!target) {
    return NextResponse.json(
      { error: 'No account with that email — they need to sign up as a customer first' },
      { status: 404 },
    );
  }
  if (target.role === 'admin' || target.role === 'ceo') {
    return NextResponse.json({ error: 'This user already has an elevated role' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'staff', department, country_code: countryCode })
    .eq('id', target.id)
    .select('id, full_name, phone, role, department, country_code, is_active, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
