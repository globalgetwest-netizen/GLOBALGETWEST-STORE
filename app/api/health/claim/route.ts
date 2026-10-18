// app/api/health/claim/route.ts
// Links a record a practitioner created (walk-in / phone / WhatsApp
// consultation) to the signed-in account. Needs the one-time code the
// practitioner gave the patient AND, when the record has an email, the same
// confirmed email on the account — so a code alone, or an email alone, is
// never enough to take over someone's record.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { apiPatientSession } from '@/lib/health/access';
import { hashClaimCode } from '@/lib/health/claimCode';
import { CONSENT_VERSION } from '@/lib/health/consent';
import { logRecordAccess } from '@/lib/health/log';
import { cleanText } from '@/lib/health/validate';

const INVALID = 'That code isn’t valid or has expired. Please ask your practitioner for a new one.';

export async function POST(req: NextRequest) {
  const auth = await apiPatientSession();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const code = cleanText(body?.code, 20);
  if (!code) return NextResponse.json({ error: 'Please enter the code your practitioner gave you' }, { status: 400 });
  if (body?.agreed !== true) return NextResponse.json({ error: 'Please read and agree to the notice first' }, { status: 400 });
  if (body?.consentVersion !== CONSENT_VERSION) {
    return NextResponse.json({ error: 'The consent notice has been updated. Please reload the page and read it again.' }, { status: 409 });
  }

  const { data: existing } = await supabase.from('patients').select('id').eq('profile_id', user.id).maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: 'Your account already has a health record. Please ask your practitioner or our support team to combine them.' },
      { status: 409 },
    );
  }

  const svc = supabaseServiceRole();
  const { data: patient } = await svc
    .from('patients')
    .select('id, email, consent_method, consent_given_at, claim_code_expires_at')
    .eq('claim_code_hash', hashClaimCode(code))
    .is('profile_id', null)
    .maybeSingle();

  if (!patient || !patient.claim_code_expires_at || new Date(patient.claim_code_expires_at) < new Date()) {
    return NextResponse.json({ error: INVALID }, { status: 404 });
  }

  if (patient.email) {
    const sameEmail = user.email && user.email.toLowerCase() === patient.email.toLowerCase();
    if (!sameEmail || !user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'This record was created with a different email address. Please sign in with that email, or ask your practitioner to update it.' },
        { status: 403 },
      );
    }
  }

  const { error } = await svc
    .from('patients')
    .update({
      profile_id: user.id,
      email: patient.email ?? user.email ?? null,
      consent_given_at: new Date().toISOString(),
      consent_version: CONSENT_VERSION,
      consent_method: 'self_online',
      consent_recorded_by: null,
      claim_code_hash: null,
      claim_code_expires_at: null,
    })
    .eq('id', patient.id)
    .is('profile_id', null);

  if (error) {
    console.error(`patient claim failed (${error.code ?? 'no code'})`);
    return NextResponse.json({ error: 'Your record could not be linked. Please try again.' }, { status: 500 });
  }

  // The practitioner-recorded consent is replaced by the patient's own; keep
  // a trace of the original in the access log.
  await logRecordAccess({
    actorId: user.id, actorRole: 'patient', action: 'claim_record', patientId: patient.id,
    detail: {
      consent_version: CONSENT_VERSION,
      previous_consent_method: patient.consent_method,
      previous_consent_at: patient.consent_given_at,
    },
  });

  return NextResponse.json({ patientId: patient.id });
}
