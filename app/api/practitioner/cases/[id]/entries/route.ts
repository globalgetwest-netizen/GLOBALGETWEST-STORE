// app/api/practitioner/cases/[id]/entries/route.ts
// A practitioner adds an entry to a case assigned to them: assessment, plan,
// products dispensed (optionally linked to the patient's order), lab result,
// a check-in taken by phone, a note, or a correction of an earlier entry.
import { NextRequest, NextResponse } from 'next/server';
import { apiPractitionerSession } from '@/lib/health/access';
import { createEntry } from '@/lib/health/entries';
import { readUploads } from '@/lib/health/files';
import { isOneOf, PRACTITIONER_ENTRY_KINDS } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';
import { formString } from '@/lib/health/validate';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params;
  const auth = await apiPractitionerSession();
  if (!auth.ok) return auth.response;
  const { supabase, user, practitioner } = auth.session;
  if (!isUuid(caseId)) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const kindRaw = formString(form, 'kind', 30);
  const body = formString(form, 'body', 20000);
  const visibleToPatient = formString(form, 'visibleToPatient') !== 'no';
  const orderId = formString(form, 'orderId', 36);
  const correctsEntryId = formString(form, 'correctsEntryId', 36);

  const isCorrection = !!correctsEntryId;
  if (isCorrection && !isUuid(correctsEntryId)) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  if (!isCorrection && !isOneOf(PRACTITIONER_ENTRY_KINDS, kindRaw)) {
    return NextResponse.json({ error: 'Choose the kind of entry' }, { status: 400 });
  }
  const kind = isCorrection ? 'correction' : kindRaw as (typeof PRACTITIONER_ENTRY_KINDS)[number];
  if (orderId && (kind !== 'product_dispensed' || !isUuid(orderId))) {
    return NextResponse.json({ error: 'Orders can only be linked to a “products dispensed” entry' }, { status: 400 });
  }

  const uploads = await readUploads(form);
  if ('error' in uploads) return NextResponse.json({ error: uploads.error }, { status: 400 });

  const { data: caseRow } = await supabase
    .from('treatment_cases')
    .select('id, patient_id, practitioner_id')
    .eq('id', caseId)
    .maybeSingle();
  if (!caseRow || caseRow.practitioner_id !== practitioner.id) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const result = await createEntry(
    supabase,
    { userId: user.id, patientId: caseRow.patient_id, caseId },
    {
      kind,
      body,
      authorRole: 'practitioner',
      visibleToPatient,
      orderId: orderId || null,
      correctsEntryId: isCorrection ? correctsEntryId : null,
    },
    uploads.uploads,
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logRecordAccess({
    actorId: user.id, actorRole: 'practitioner', action: 'add_entry', patientId: caseRow.patient_id, caseId,
    detail: { entry_id: result.entryId, kind, visible_to_patient: visibleToPatient, files: result.fileCount },
  });
  return NextResponse.json({ entryId: result.entryId });
}
