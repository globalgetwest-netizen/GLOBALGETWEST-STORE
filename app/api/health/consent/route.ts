// app/api/health/consent/route.ts
// A signed-in customer agrees to the consent notice and their patient record
// is created. No consent, no record — the database enforces that too.
import { NextRequest, NextResponse } from 'next/server';
import { apiPatientSession } from '@/lib/health/access';
import { CONSENT_VERSION } from '@/lib/health/consent';
import { isOneOf, SEXES } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { cleanText, validCountry, validDateOfBirth } from '@/lib/health/validate';

export async function POST(req: NextRequest) {
  const auth = await apiPatientSession();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  if (body.agreed !== true) return NextResponse.json({ error: 'Please read and agree to the notice first' }, { status: 400 });
  if (body.consentVersion !== CONSENT_VERSION) {
    return NextResponse.json({ error: 'The consent notice has been updated. Please reload the page and read it again.' }, { status: 409 });
  }

  const fullName = cleanText(body.fullName, 120);
  const dateOfBirth = validDateOfBirth(cleanText(body.dateOfBirth, 10));
  const countryCode = validCountry(cleanText(body.countryCode, 2));
  const phone = cleanText(body.phone, 40);
  const sex = isOneOf(SEXES, body.sex) ? body.sex : null;

  if (!fullName) return NextResponse.json({ error: 'Please enter your full name' }, { status: 400 });
  if (!dateOfBirth) return NextResponse.json({ error: 'Please enter a valid date of birth' }, { status: 400 });
  if (!countryCode) return NextResponse.json({ error: 'Please choose your country' }, { status: 400 });

  const { data: existing } = await supabase.from('patients').select('id').eq('profile_id', user.id).maybeSingle();
  if (existing) return NextResponse.json({ error: 'You already have a health record' }, { status: 409 });

  const { data: patient, error } = await supabase
    .from('patients')
    .insert({
      profile_id: user.id,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      sex,
      phone: phone || null,
      email: user.email ?? null,
      country_code: countryCode,
      consent_given_at: new Date().toISOString(),
      consent_version: CONSENT_VERSION,
      consent_method: 'self_online',
    })
    .select('id')
    .single();

  if (error || !patient) {
    console.error(`patients insert refused (${error?.code ?? 'no row'})`);
    return NextResponse.json({ error: 'Your record could not be created. Please try again.' }, { status: 500 });
  }

  await logRecordAccess({
    actorId: user.id, actorRole: 'patient', action: 'consent_given', patientId: patient.id,
    detail: { consent_version: CONSENT_VERSION },
  });

  return NextResponse.json({ patientId: patient.id });
}
