// app/admin/patient-cases/[id]/page.tsx
// Admin view of one case: read-only timeline, assignment, who accessed it,
// and (CEO only) erasure on a verified deletion request.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRecordsAdminSession, isLicenceActive } from '@/lib/health/access';
import { formatRecordDate, formatRecordDateTime } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { loadCaseRecord } from '@/lib/health/records';
import { MfaRequired } from '@/components/health/MfaRequired';
import { StatusBadge } from '@/components/health/StatusBadge';
import { Timeline } from '@/components/health/Timeline';
import { CaseAssigner } from '@/components/admin/CaseAssigner';
import { EraseRecordButton } from '@/components/admin/EraseRecordButton';

const ACTION_LABELS: Record<string, string> = {
  view_case: 'Viewed case',
  view_file: 'Opened attachment',
  add_entry: 'Added entry',
  update_case: 'Changed case',
  assign_case: 'Assigned case',
  open_case: 'Opened case',
  request_consultation: 'Requested consultation',
};

export default async function AdminCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRecordsAdminSession();
  if (!session.mfaVerified) return <MfaRequired hasFactor={session.hasMfaFactor} next={`/admin/patient-cases/${id}`} audience="admin" />;
  const { supabase, user } = session;

  const record = await loadCaseRecord(supabase, id);
  if (!record) notFound();
  const { patient, caseRow, entries, practitioner, categoryName } = record;

  const [{ data: practitionerRows }, { data: log }] = await Promise.all([
    supabase.from('practitioners').select('id, display_name, country_code, verified_at, revoked_at, license_expires_on'),
    supabase.from('record_access_log').select('id, actor_id, actor_role, action, created_at').eq('case_id', id).order('created_at', { ascending: false }).limit(50),
  ]);
  const assignable = (practitionerRows ?? []).filter((p) => isLicenceActive(p)).map((p) => ({ id: p.id, label: `${p.display_name} (${p.country_code})` }));
  if (caseRow.practitioner_id && !assignable.some((a) => a.id === caseRow.practitioner_id)) {
    assignable.push({ id: caseRow.practitioner_id, label: `${practitioner?.display_name ?? 'Practitioner'} — licence not active` });
  }

  const actorIds = [...new Set((log ?? []).map((l) => l.actor_id).filter((a): a is string => !!a))];
  const { data: actors } = actorIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', actorIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const actorName = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email || 'Unknown']));

  await logRecordAccess({ actorId: user.id, actorRole: session.isCeo ? 'ceo' : 'admin', action: 'view_case', patientId: patient.id, caseId: id });

  return (
    <div>
      <Link href="/admin/patient-cases" className="focus-ring text-xs text-[var(--color-ink-soft)] hover:underline">← Patient Records</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{patient.full_name}</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            {caseRow.condition}{categoryName && <> · {categoryName}</>} · started {formatRecordDate(caseRow.started_at)}
          </p>
        </div>
        <StatusBadge status={caseRow.status} outcome={caseRow.outcome} />
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-ink-soft)] mb-4">Read-only. Only the assigned practitioner writes clinical entries.</p>
          <Timeline entries={entries} viewer="admin" />
        </div>

        <aside className="space-y-4">
          <div className="border border-[var(--color-border)] rounded-lg bg-white p-5 text-sm space-y-3">
            <h3 className="font-display text-xl">Practitioner</h3>
            {caseRow.closed_at ? (
              <p>{practitioner?.display_name ?? 'None'}</p>
            ) : (
              <CaseAssigner caseId={id} current={caseRow.practitioner_id} practitioners={assignable} />
            )}
          </div>

          <div className="border border-[var(--color-border)] rounded-lg bg-white p-5 text-sm space-y-1.5">
            <h3 className="font-display text-xl mb-1">Patient</h3>
            <p><span className="text-[var(--color-ink-soft)]">Email:</span> {patient.email ?? '—'}</p>
            <p><span className="text-[var(--color-ink-soft)]">Phone:</span> {patient.phone ?? '—'}</p>
            <p><span className="text-[var(--color-ink-soft)]">Country:</span> {patient.country_code ?? '—'}</p>
            <p><span className="text-[var(--color-ink-soft)]">Account:</span> {patient.profile_id ? 'Linked' : 'Not linked yet'}</p>
            <p>
              <span className="text-[var(--color-ink-soft)]">Consent:</span> {formatRecordDate(patient.consent_given_at)}, v{patient.consent_version},{' '}
              {patient.consent_method === 'self_online' ? 'given online' : 'recorded by practitioner'}
            </p>
            {session.isCeo && (
              <div className="pt-3">
                <EraseRecordButton patientId={patient.id} patientName={patient.full_name} />
              </div>
            )}
          </div>

          <div className="border border-[var(--color-border)] rounded-lg bg-white p-5 text-sm">
            <h3 className="font-display text-xl mb-3">Access log</h3>
            {(log ?? []).length === 0 ? (
              <p className="text-xs text-[var(--color-ink-soft)]">No access recorded yet.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {(log ?? []).map((l) => (
                  <li key={l.id}>
                    <span className="font-medium">{l.actor_id ? actorName.get(l.actor_id) ?? 'Unknown' : 'System'}</span>
                    <span className="text-[var(--color-ink-soft)]"> ({l.actor_role}) · {ACTION_LABELS[l.action] ?? l.action}</span>
                    <span className="block text-[var(--color-ink-muted)]">{formatRecordDateTime(l.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
