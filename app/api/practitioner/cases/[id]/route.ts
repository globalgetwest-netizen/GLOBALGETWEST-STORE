// app/api/practitioner/cases/[id]/route.ts
// Status, closing with an outcome, reopening, and refining the condition.
// Every one of these is written to the case timeline by the database itself
// (migration 017's trigger), so the history can't be skipped.
import { NextRequest, NextResponse } from 'next/server';
import { apiPractitionerSession } from '@/lib/health/access';
import { friendlyDbError } from '@/lib/health/entries';
import { CASE_OUTCOMES, isOneOf, OPEN_STATUSES } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';
import { cleanText } from '@/lib/health/validate';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await apiPractitionerSession();
  if (!auth.ok) return auth.response;
  const { supabase, user, practitioner } = auth.session;
  if (!isUuid(id)) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { data: caseRow } = await supabase
    .from('treatment_cases')
    .select('id, patient_id, practitioner_id, status, outcome')
    .eq('id', id)
    .maybeSingle();
  if (!caseRow || caseRow.practitioner_id !== practitioner.id) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  let update: Record<string, unknown>;
  let detail: Record<string, string>;

  switch (body.action) {
    case 'status': {
      if (caseRow.outcome) return NextResponse.json({ error: 'Reopen the case before changing its status' }, { status: 409 });
      if (!isOneOf(OPEN_STATUSES, body.status)) return NextResponse.json({ error: 'Choose a valid status' }, { status: 400 });
      if (body.status === caseRow.status) return NextResponse.json({ ok: true });
      update = { status: body.status };
      detail = { change: 'status', from: caseRow.status, to: body.status };
      break;
    }
    case 'close': {
      if (caseRow.outcome) return NextResponse.json({ error: 'This case is already closed' }, { status: 409 });
      const note = cleanText(body.note, 5000);
      if (!isOneOf(CASE_OUTCOMES, body.outcome)) return NextResponse.json({ error: 'Choose the outcome' }, { status: 400 });
      if (!note) return NextResponse.json({ error: 'Describe what actually happened — the outcome note is part of the record' }, { status: 400 });
      update = { outcome: body.outcome, outcome_note: note };
      detail = { change: 'close', outcome: body.outcome };
      break;
    }
    case 'reopen': {
      if (!caseRow.outcome) return NextResponse.json({ error: 'This case is not closed' }, { status: 409 });
      update = { outcome: null };
      detail = { change: 'reopen', previous_outcome: caseRow.outcome };
      break;
    }
    case 'condition': {
      const condition = cleanText(body.condition, 200);
      if (!condition) return NextResponse.json({ error: 'Enter the condition' }, { status: 400 });
      update = { condition };
      detail = { change: 'condition' };
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { data: updated, error } = await supabase.from('treatment_cases').update(update).eq('id', id).select('id');
  if (error || !updated?.length) {
    console.error(`case update refused (${error?.code ?? 'no row'})`);
    return NextResponse.json({ error: error ? friendlyDbError(error.message) : 'The case could not be updated' }, { status: 400 });
  }

  await logRecordAccess({
    actorId: user.id, actorRole: 'practitioner', action: 'update_case', patientId: caseRow.patient_id, caseId: id, detail,
  });
  return NextResponse.json({ ok: true });
}
