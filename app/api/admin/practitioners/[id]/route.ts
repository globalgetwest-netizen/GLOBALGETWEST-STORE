// app/api/admin/practitioners/[id]/route.ts
// Verify a licence (after checking it with the licensing body), revoke it,
// or reinstate it. Verification stamps who verified and when (database
// trigger), and you can't verify your own licence.
import { NextRequest, NextResponse } from 'next/server';
import { apiRecordsAdminSession, actorRoleFor } from '@/lib/health/access';
import { friendlyDbError } from '@/lib/health/entries';
import { logRecordAccess } from '@/lib/health/log';
import { isUuid } from '@/lib/health/records';
import { cleanText } from '@/lib/health/validate';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await apiRecordsAdminSession();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;
  if (!isUuid(id)) return NextResponse.json({ error: 'Practitioner not found' }, { status: 404 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { data: current } = await supabase
    .from('practitioners')
    .select('id, profile_id, verified_at, revoked_at')
    .eq('id', id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: 'Practitioner not found' }, { status: 404 });

  let update: Record<string, unknown>;
  let action: 'verify_practitioner' | 'revoke_practitioner';

  if (body.action === 'verify') {
    if (body.attested !== true) {
      return NextResponse.json({ error: 'Confirm that you checked this licence with the licensing body' }, { status: 400 });
    }
    if (current.profile_id === user.id) return NextResponse.json({ error: 'You cannot verify your own licence' }, { status: 403 });
    if (current.verified_at && !current.revoked_at) return NextResponse.json({ ok: true });
    update = { verified_at: new Date().toISOString(), revoked_at: null };
    action = 'verify_practitioner';
  } else if (body.action === 'revoke') {
    const reason = cleanText(body.reason, 300);
    if (!reason) return NextResponse.json({ error: 'Give a reason for revoking (kept on record)' }, { status: 400 });
    if (current.revoked_at) return NextResponse.json({ ok: true });
    update = { revoked_at: new Date().toISOString(), revoked_reason: reason };
    action = 'revoke_practitioner';
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { data: updated, error } = await supabase.from('practitioners').update(update).eq('id', id).select('id');
  if (error || !updated?.length) {
    console.error(`practitioner update refused (${error?.code ?? 'no row'})`);
    return NextResponse.json({ error: error ? friendlyDbError(error.message) : 'Not allowed' }, { status: 400 });
  }

  await logRecordAccess({
    actorId: user.id, actorRole: actorRoleFor(auth.session, 'admin'), action, detail: { practitioner_id: id },
  });
  return NextResponse.json({ ok: true });
}
