// app/api/admin/patients/[id]/route.ts
// Erases a patient's entire health record after a verified deletion request
// (consent withdrawn). CEO only, with two-step sign-in, and the CEO must type
// the patient's full name to confirm. Deletes every case, entry and file;
// the access log keeps a content-free line saying it happened.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { apiRecordsAdminSession } from '@/lib/health/access';
import { removeStoredFiles } from '@/lib/health/files';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';
import { cleanText } from '@/lib/health/validate';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await apiRecordsAdminSession({ ceoOnly: true });
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;
  if (!isUuid(id)) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const confirmName = cleanText(body?.confirmName, 200);

  // Read through RLS first: proves the CEO session (with MFA) can see it.
  const { data: patient } = await supabase.from('patients').select('id, full_name').eq('id', id).maybeSingle();
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  if (confirmName !== patient.full_name.trim()) {
    return NextResponse.json({ error: 'Type the patient’s full name exactly as shown to confirm' }, { status: 400 });
  }

  const svc = supabaseServiceRole();
  const { data: cases } = await svc.from('treatment_cases').select('id').eq('patient_id', id);
  const caseIds = (cases ?? []).map((c) => c.id);
  const { data: files } = caseIds.length
    ? await svc.from('case_entry_files').select('storage_path').in('case_id', caseIds)
    : { data: [] as { storage_path: string }[] };
  const paths = (files ?? []).map((f) => f.storage_path);

  // Log first (fails closed): if the log can't be written, nothing is erased.
  await logRecordAccess({
    actorId: user.id, actorRole: 'ceo', action: 'erase_patient', patientId: id,
    detail: { cases: caseIds.length, files: paths.length },
  });

  // Database rows first (one cascading delete), then the files — so a failure
  // can never leave a record pointing at files that are already gone.
  const { error } = await svc.from('patients').delete().eq('id', id);
  if (error) {
    console.error(`patient erasure failed (${error.code ?? 'no code'})`);
    return NextResponse.json({ error: 'The record could not be erased. Nothing was deleted; please try again.' }, { status: 500 });
  }

  const filesRemoved = await removeStoredFiles(paths);
  if (!filesRemoved) {
    return NextResponse.json({
      ok: true,
      warning: `The record was erased, but ${paths.length} stored file(s) could not be removed. They are no longer reachable from the site; remove the folder “${id}” from the patient-files bucket in Supabase Storage.`,
    });
  }
  return NextResponse.json({ ok: true });
}
