// app/api/practitioner/patients/[id]/claim-code/route.ts
// Issues a fresh one-time code for a patient who hasn't linked their record
// to an account yet (the old code stops working).
import { NextRequest, NextResponse } from 'next/server';
import { apiPractitionerSession } from '@/lib/health/access';
import { generateClaimCode } from '@/lib/health/claimCode';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await apiPractitionerSession();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;
  if (!isUuid(id)) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const { data: patient } = await supabase.from('patients').select('id, profile_id').eq('id', id).maybeSingle();
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  if (patient.profile_id) return NextResponse.json({ error: 'This patient has already linked the record to their account' }, { status: 409 });

  const claim = generateClaimCode();
  const { data: updated, error } = await supabase
    .from('patients')
    .update({ claim_code_hash: claim.hash, claim_code_expires_at: claim.expiresAt })
    .eq('id', id)
    .is('profile_id', null)
    .select('id');
  if (error || !updated?.length) return NextResponse.json({ error: 'A new code could not be issued' }, { status: 500 });

  await logRecordAccess({ actorId: user.id, actorRole: 'practitioner', action: 'reset_claim_code', patientId: id });
  return NextResponse.json({ claimCode: claim.code, claimCodeExpiresAt: claim.expiresAt });
}
