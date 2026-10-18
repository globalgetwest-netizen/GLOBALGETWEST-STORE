// app/api/health/cases/route.ts
// A patient asks for a consultation about a condition. This opens an
// unassigned case with the patient's own description as the intake entry;
// an administrator then assigns it to a licensed practitioner.
import { NextRequest, NextResponse } from 'next/server';
import { apiPatientSession } from '@/lib/health/access';
import { createEntry } from '@/lib/health/entries';
import { readUploads } from '@/lib/health/files';
import { FEELINGS, isOneOf } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';
import { formString } from '@/lib/health/validate';

export async function POST(req: NextRequest) {
  const auth = await apiPatientSession();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const condition = formString(form, 'condition', 200);
  const description = formString(form, 'body', 20000);
  const categoryId = formString(form, 'categoryId', 36);
  const feeling = formString(form, 'feeling', 20);
  if (!condition) return NextResponse.json({ error: 'Please say what you would like help with' }, { status: 400 });
  if (!description) return NextResponse.json({ error: 'Please describe your symptoms' }, { status: 400 });

  const uploads = await readUploads(form);
  if ('error' in uploads) return NextResponse.json({ error: uploads.error }, { status: 400 });

  const { data: patient } = await supabase.from('patients').select('id').eq('profile_id', user.id).maybeSingle();
  if (!patient) return NextResponse.json({ error: 'Please complete the consent step first' }, { status: 409 });

  const { data: newCase, error } = await supabase
    .from('treatment_cases')
    .insert({
      patient_id: patient.id,
      condition,
      category_id: categoryId && isUuid(categoryId) ? categoryId : null,
      status: 'intake',
    })
    .select('id')
    .single();

  if (error || !newCase) {
    console.error(`consultation request refused (${error?.code ?? 'no row'})`);
    return NextResponse.json({ error: 'Your request could not be sent. Please try again.' }, { status: 500 });
  }

  const result = await createEntry(
    supabase,
    { userId: user.id, patientId: patient.id, caseId: newCase.id },
    { kind: 'intake', body: description, authorRole: 'patient', feeling: isOneOf(FEELINGS, feeling) ? feeling : null },
    uploads.uploads,
  );

  await logRecordAccess({
    actorId: user.id, actorRole: 'patient', action: 'request_consultation', patientId: patient.id, caseId: newCase.id,
    detail: result.ok ? { entry_id: result.entryId, files: result.fileCount } : { entry_saved: false },
  });

  if (!result.ok) return NextResponse.json({ error: result.error, caseId: newCase.id }, { status: result.status });
  return NextResponse.json({ caseId: newCase.id });
}
