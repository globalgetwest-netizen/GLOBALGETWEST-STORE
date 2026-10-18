// app/api/practitioner/cases/route.ts
// Opens another case (a different condition) for a patient the practitioner
// already looks after. RLS only allows this for their own patients.
import { NextRequest, NextResponse } from 'next/server';
import { apiPractitionerSession } from '@/lib/health/access';
import { createEntry } from '@/lib/health/entries';
import { readUploads } from '@/lib/health/files';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';
import { formString } from '@/lib/health/validate';

export async function POST(req: NextRequest) {
  const auth = await apiPractitionerSession();
  if (!auth.ok) return auth.response;
  const { supabase, user, practitioner } = auth.session;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const patientId = formString(form, 'patientId', 36);
  const condition = formString(form, 'condition', 200);
  const categoryId = formString(form, 'categoryId', 36);
  const intake = formString(form, 'intake', 20000);
  const startActive = formString(form, 'status') === 'active';
  if (!isUuid(patientId)) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  if (!condition) return NextResponse.json({ error: 'Enter the condition being treated' }, { status: 400 });
  if (!intake) return NextResponse.json({ error: 'Write the intake notes' }, { status: 400 });

  const uploads = await readUploads(form);
  if ('error' in uploads) return NextResponse.json({ error: uploads.error }, { status: 400 });

  const { data: patient } = await supabase.from('patients').select('id').eq('id', patientId).maybeSingle();
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const { data: newCase, error } = await supabase
    .from('treatment_cases')
    .insert({
      patient_id: patientId,
      condition,
      category_id: categoryId && isUuid(categoryId) ? categoryId : null,
      practitioner_id: practitioner.id,
      status: startActive ? 'active' : 'intake',
    })
    .select('id')
    .single();
  if (error || !newCase) {
    console.error(`practitioner case insert refused (${error?.code ?? 'no row'})`);
    return NextResponse.json({ error: 'The case could not be opened' }, { status: error?.code === '42501' ? 403 : 500 });
  }

  const result = await createEntry(
    supabase,
    { userId: user.id, patientId, caseId: newCase.id },
    { kind: 'intake', body: intake, authorRole: 'practitioner', visibleToPatient: true },
    uploads.uploads,
  );

  await logRecordAccess({
    actorId: user.id, actorRole: 'practitioner', action: 'open_case', patientId, caseId: newCase.id,
    detail: result.ok ? { entry_id: result.entryId, files: result.fileCount } : { entry_saved: false },
  });

  if (!result.ok) return NextResponse.json({ error: result.error, caseId: newCase.id }, { status: result.status });
  return NextResponse.json({ caseId: newCase.id });
}
