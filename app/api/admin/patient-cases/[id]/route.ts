// app/api/admin/patient-cases/[id]/route.ts
// Assign (or reassign / unassign) a case to a verified practitioner. The
// database writes the change to the case timeline.
import { NextRequest, NextResponse } from 'next/server';
import { apiRecordsAdminSession, actorRoleFor } from '@/lib/health/access';
import { friendlyDbError } from '@/lib/health/entries';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await apiRecordsAdminSession();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;
  if (!isUuid(id)) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const body = await req.json().catch(() => null) as { practitionerId?: unknown } | null;
  const practitionerId = body?.practitionerId ?? null;
  if (practitionerId !== null && (typeof practitionerId !== 'string' || !isUuid(practitionerId))) {
    return NextResponse.json({ error: 'Choose a practitioner' }, { status: 400 });
  }

  const { data: caseRow } = await supabase.from('treatment_cases').select('id, patient_id, practitioner_id').eq('id', id).maybeSingle();
  if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  if (caseRow.practitioner_id === practitionerId) return NextResponse.json({ ok: true });

  const { data: updated, error } = await supabase
    .from('treatment_cases')
    .update({ practitioner_id: practitionerId })
    .eq('id', id)
    .select('id');
  if (error || !updated?.length) {
    console.error(`case assignment refused (${error?.code ?? 'no row'})`);
    return NextResponse.json({ error: error ? friendlyDbError(error.message) : 'Not allowed' }, { status: 400 });
  }

  await logRecordAccess({
    actorId: user.id, actorRole: actorRoleFor(auth.session, 'admin'), action: 'assign_case',
    patientId: caseRow.patient_id, caseId: id,
    detail: { from_practitioner_id: caseRow.practitioner_id, to_practitioner_id: practitionerId as string | null },
  });
  return NextResponse.json({ ok: true });
}
