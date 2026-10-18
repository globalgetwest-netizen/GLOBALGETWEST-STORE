// app/api/admin/practitioners/route.ts
// Admin adds a practitioner's licence details to an existing account. The
// practitioner gets no record access until an admin separately verifies the
// licence with the licensing body (PATCH …/[id], action "verify").
import { NextRequest, NextResponse } from 'next/server';
import { apiRecordsAdminSession, actorRoleFor } from '@/lib/health/access';
import { logRecordAccess } from '@/lib/health/log';
import { cleanText, validCountry, validEmail, validFutureDate } from '@/lib/health/validate';

export async function POST(req: NextRequest) {
  const auth = await apiRecordsAdminSession();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const email = validEmail(cleanText(body.email, 254));
  const displayName = cleanText(body.displayName, 120);
  const specialty = cleanText(body.specialty, 120);
  const licenseNumber = cleanText(body.licenseNumber, 80);
  const licensingBody = cleanText(body.licensingBody, 160);
  const countryCode = validCountry(cleanText(body.countryCode, 2));
  const expiresRaw = cleanText(body.licenseExpiresOn, 10);
  const licenseExpiresOn = expiresRaw ? validFutureDate(expiresRaw) : null;

  if (!email) return NextResponse.json({ error: 'Enter the practitioner’s account email' }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: 'Enter the name patients will see (e.g. “Dr Ama Mensah”)' }, { status: 400 });
  if (!licenseNumber || !licensingBody) return NextResponse.json({ error: 'Enter the licence number and the licensing body' }, { status: 400 });
  if (!countryCode) return NextResponse.json({ error: 'Choose the country that issued the licence' }, { status: 400 });
  if (expiresRaw && !licenseExpiresOn) return NextResponse.json({ error: 'Enter a valid expiry date, or leave it blank' }, { status: 400 });

  const { data: target } = await supabase.from('profiles').select('id, is_active').eq('email', email).maybeSingle();
  if (!target) {
    return NextResponse.json({ error: 'No account with that email — they need to sign up first' }, { status: 404 });
  }
  if (!target.is_active) return NextResponse.json({ error: 'That account is deactivated' }, { status: 400 });

  const { data, error } = await supabase
    .from('practitioners')
    .insert({
      profile_id: target.id,
      display_name: displayName,
      specialty: specialty || null,
      license_number: licenseNumber,
      licensing_body: licensingBody,
      country_code: countryCode,
      license_expires_on: licenseExpiresOn,
      added_by: user.id,
    })
    .select('id')
    .single();

  if (error || !data) {
    if (error?.code === '23505') return NextResponse.json({ error: 'That account is already registered as a practitioner' }, { status: 409 });
    console.error(`practitioner insert refused (${error?.code ?? 'no row'})`);
    return NextResponse.json({ error: 'The practitioner could not be added' }, { status: 500 });
  }

  await logRecordAccess({
    actorId: user.id, actorRole: actorRoleFor(auth.session, 'admin'), action: 'add_practitioner',
    detail: { practitioner_id: data.id },
  });
  return NextResponse.json({ id: data.id });
}
