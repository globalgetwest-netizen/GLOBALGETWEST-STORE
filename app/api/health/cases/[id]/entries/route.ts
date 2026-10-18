// app/api/health/cases/[id]/entries/route.ts
// A patient adds a check-in (or corrects one of their own check-ins) on one
// of their cases. RLS guarantees it's their case and that they can only
// write check-ins — never practitioner entries.
import { NextRequest, NextResponse } from 'next/server';
import { apiPatientSession } from '@/lib/health/access';
import { createEntry } from '@/lib/health/entries';
import { readUploads } from '@/lib/health/files';
import { FEELINGS, isOneOf } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';
import { formString } from '@/lib/health/validate';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params;
  const auth = await apiPatientSession();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;
  if (!isUuid(caseId)) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const body = formString(form, 'body', 20000);
  const feeling = formString(form, 'feeling', 20);
  const correctsEntryId = formString(form, 'correctsEntryId', 36);

  const uploads = await readUploads(form);
  if ('error' in uploads) return NextResponse.json({ error: uploads.error }, { status: 400 });

  // Own patient record + own case, both through RLS.
  const { data: patient } = await supabase.from('patients').select('id').eq('profile_id', user.id).maybeSingle();
  const { data: caseRow } = patient
    ? await supabase.from('treatment_cases').select('id, patient_id, outcome').eq('id', caseId).eq('patient_id', patient.id).maybeSingle()
    : { data: null };
  if (!patient || !caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  if (caseRow.outcome) return NextResponse.json({ error: 'This case is closed. Please contact your practitioner.' }, { status: 409 });

  const isCorrection = !!correctsEntryId && isUuid(correctsEntryId);
  const result = await createEntry(
    supabase,
    { userId: user.id, patientId: patient.id, caseId },
    {
      kind: isCorrection ? 'correction' : 'check_in',
      body,
      authorRole: 'patient',
      correctsEntryId: isCorrection ? correctsEntryId : null,
      feeling: !isCorrection && isOneOf(FEELINGS, feeling) ? feeling : null,
    },
    uploads.uploads,
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logRecordAccess({
    actorId: user.id, actorRole: 'patient', action: 'add_entry', patientId: patient.id, caseId,
    detail: { entry_id: result.entryId, kind: isCorrection ? 'correction' : 'check_in', files: result.fileCount },
  });

  return NextResponse.json({ entryId: result.entryId });
}
