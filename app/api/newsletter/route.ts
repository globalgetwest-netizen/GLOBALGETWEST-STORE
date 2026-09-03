// app/api/newsletter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const supabase = supabaseServiceRole();
  const { error } = await supabase.from('newsletter_subscribers').insert({ email });

  if (error) {
    // Unique constraint violation = already subscribed — treat as success,
    // not an error, since that's not actually a problem for the visitor.
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }
    return NextResponse.json({ error: 'Something went wrong, please try again' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
