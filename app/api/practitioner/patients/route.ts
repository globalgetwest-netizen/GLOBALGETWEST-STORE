// app/api/practitioner/patients/route.ts
// A practitioner registers a patient they consulted (in person, by phone or
// on WhatsApp), records that the patient consented, and opens the first case
// with an intake entry. Returns a one-time code the patient uses to see the
// record in their own account.
import { NextRequest, NextResponse } from 'next/server';
import { apiPractitionerSession } from '@/lib/health/access';
import { generateClaimCode } from '@/lib/health/claimCode';
import { CONSENT_VERSION } from '@/lib/health/consent';
import { createEntry } from '@/lib/health/entries';
import { readUploads } from '@/lib/health/files';
import { isOneOf, SEXES } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';
import { formString, validCountry, validDateOfBirth, validEmail } from '@/lib/health/validate';

export async function POST(req: NextRequest) {
  const auth = await apiPractitionerSession();
  if (!auth.ok) return auth.response;
  const { supabase, user, practitioner } = auth.session;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  if (formString(form, 'consentConfirmed') !== 'yes') {
    return NextResponse.json({ error: 'Confirm that the patient gave consent before creating a record' }, { status: 400 });
  }

  const fullName = formString(form, 'fullName', 120);
  const dobRaw = formString(form, 'dateOfBirth', 10);
  const dateOfBirth = dobRaw ? validDateOfBirth(dobRaw) : null;
  const emailRaw = formString(form, 'email', 254);
  const email = emailRaw ? validEmail(emailRaw) : null;
  const countryCode = validCountry(formString(form, 'countryCode', 2));
  const sex = formString(form, 'sex', 20);
  const phone = formString(form, 'phone', 40);
  const condition = formString(form, 'condition', 200);
  const categoryId = formString(form, 'categoryId', 36);
  const intake = formString(form, 'intake', 20000);
  const startActive = formString(form, 'status') === 'active';

  if (!fullName) return NextResponse.json({ error: 'Enter the patient’s full name' }, { status: 400 });
  if (dobRaw && !dateOfBirth) return NextResponse.json({ error: 'Enter a valid date of birth' }, { status: 400 });
  if (emailRaw && !email) return NextResponse.json({ error: 'Enter a valid email address, or leave it blank' }, { status: 400 });
  if (!countryCode) return NextResponse.json({ error: 'Choose the patient’s country' }, { status: 400 });
  if (!email && !phone) return NextResponse.json({ error: 'Enter an email or a phone number so the patient can be reached' }, { status: 400 });
  if (!condition) return NextResponse.json({ error: 'Enter the condition being treated' }, { status: 400 });
  if (!intake) return NextResponse.json({ error: 'Write the intake notes' }, { status: 400 });

  const uploads = await readUploads(form);
  if ('error' in uploads) return NextResponse.json({ error: uploads.error }, { status: 400 });

  const claim = generateClaimCode();
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .insert({
      full_name: fullName,
      date_of_birth: dateOfBirth,
      sex: isOneOf(SEXES, sex) ? sex : null,
      phone: phone || null,
      email,
      country_code: countryCode,
      consent_given_at: new Date().toISOString(),
      consent_version: CONSENT_VERSION,
      consent_method: 'recorded_by_practitioner',
      consent_recorded_by: user.id,
      created_by_practitioner_id: practitioner.id,
      claim_code_hash: claim.hash,
      claim_code_expires_at: claim.expiresAt,
    })
    .select('id')
    .single();

  if (patientError || !patient) {
    console.error(`practitioner patient insert refused (${patientError?.code ?? 'no row'})`);
    return NextResponse.json({ error: 'The patient record could not be created' }, { status: 500 });
  }

  await logRecordAccess({
    actorId: user.id, actorRole: 'practitioner', action: 'register_patient', patientId: patient.id,
    detail: { consent_version: CONSENT_VERSION },
  });

  const { data: newCase, error: caseError } = await supabase
    .from('treatment_cases')
    .insert({
      patient_id: patient.id,
      condition,
      category_id: categoryId && isUuid(categoryId) ? categoryId : null,
      practitioner_id: practitioner.id,
      status: startActive ? 'active' : 'intake',
    })
    .select('id')
    .single();

  if (caseError || !newCase) {
    console.error(`practitioner case insert refused (${caseError?.code ?? 'no row'})`);
    return NextResponse.json({ error: 'The patient was registered but the case could not be opened. Open it from the patient’s page.' }, { status: 500 });
  }

  const result = await createEntry(
    supabase,
    { userId: user.id, patientId: patient.id, caseId: newCase.id },
    { kind: 'intake', body: intake, authorRole: 'practitioner', visibleToPatient: true },
    uploads.uploads,
  );

  await logRecordAccess({
    actorId: user.id, actorRole: 'practitioner', action: 'open_case', patientId: patient.id, caseId: newCase.id,
    detail: result.ok ? { entry_id: result.entryId, files: result.fileCount } : { entry_saved: false },
  });

  if (!result.ok) return NextResponse.json({ error: result.error, caseId: newCase.id }, { status: result.status });
  return NextResponse.json({ caseId: newCase.id, claimCode: claim.code, claimCodeExpiresAt: claim.expiresAt });
}
