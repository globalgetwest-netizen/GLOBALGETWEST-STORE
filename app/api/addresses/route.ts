// app/api/addresses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { fullName, phone, line1, line2, city, region, postalCode, countryCode } = body;

  if (!fullName || !phone || !line1 || !city || !countryCode) {
    return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      profile_id: user.id,
      full_name: fullName,
      phone,
      line1,
      line2: line2 || null,
      city,
      region: region || null,
      postal_code: postalCode || null,
      country_code: countryCode,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
