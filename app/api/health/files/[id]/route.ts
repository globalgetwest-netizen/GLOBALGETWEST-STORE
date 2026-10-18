// app/api/health/files/[id]/route.ts
// Opens an attachment. RLS decides whether the signed-in user may see the
// file row at all (patient: own case + visible entry; practitioner: assigned
// case with MFA; admin: MFA). Only then is a 60-second signed URL created.
import { NextRequest, NextResponse } from 'next/server';
import { getRecordsSession, type RecordsActorRole } from '@/lib/health/access';
import { signedFileUrl } from '@/lib/health/files';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getRecordsSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: NO_STORE });
  if (!isUuid(id)) return NextResponse.json({ error: 'File not found' }, { status: 404, headers: NO_STORE });

  const { supabase, user } = session;
  const { data: file } = await supabase
    .from('case_entry_files')
    .select('id, case_id, entry_id, storage_path')
    .eq('id', id)
    .maybeSingle();
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404, headers: NO_STORE });

  const { data: caseRow } = await supabase.from('treatment_cases').select('patient_id, practitioner_id').eq('id', file.case_id).maybeSingle();
  const { data: patient } = caseRow
    ? await supabase.from('patients').select('profile_id').eq('id', caseRow.patient_id).maybeSingle()
    : { data: null };

  let actorRole: RecordsActorRole;
  if (patient?.profile_id === user.id) actorRole = 'patient';
  else if (session.practitioner && caseRow?.practitioner_id === session.practitioner.id) actorRole = 'practitioner';
  else actorRole = session.isCeo ? 'ceo' : 'admin';

  const url = await signedFileUrl(file.storage_path);
  if (!url) return NextResponse.json({ error: 'File could not be opened' }, { status: 502, headers: NO_STORE });

  await logRecordAccess({
    actorId: user.id, actorRole, action: 'view_file', patientId: caseRow?.patient_id ?? null, caseId: file.case_id,
    detail: { file_id: file.id, entry_id: file.entry_id },
  });

  return NextResponse.redirect(url, { status: 303, headers: NO_STORE });
}
