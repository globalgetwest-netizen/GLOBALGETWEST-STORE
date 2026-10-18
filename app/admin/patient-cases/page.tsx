// app/admin/patient-cases/page.tsx
// Every patient case, for assigning to practitioners. Requires MFA (RLS
// returns nothing without it).
import Link from 'next/link';
import { requireRecordsAdminSession, isLicenceActive } from '@/lib/health/access';
import { formatRecordDate } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { CASE_COLUMNS, type CaseSummary } from '@/lib/health/records';
import { MfaRequired } from '@/components/health/MfaRequired';
import { StatusBadge } from '@/components/health/StatusBadge';
import { CaseAssigner } from '@/components/admin/CaseAssigner';

const FILTERS = [
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
] as const;

export default async function AdminPatientCasesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireRecordsAdminSession();
  if (!session.mfaVerified) return <MfaRequired hasFactor={session.hasMfaFactor} next="/admin/patient-cases" audience="admin" />;
  const { supabase, user } = session;

  const { status } = await searchParams;
  const filter = FILTERS.some((f) => f.key === status) ? status! : 'unassigned';

  let query = supabase.from('treatment_cases').select(CASE_COLUMNS).order('started_at', { ascending: false }).limit(300);
  if (filter === 'unassigned') query = query.is('practitioner_id', null).is('closed_at', null);
  if (filter === 'open') query = query.is('closed_at', null);
  if (filter === 'closed') query = query.not('closed_at', 'is', null);

  const [{ data: caseRows }, { data: practitionerRows }] = await Promise.all([
    query,
    supabase.from('practitioners').select('id, display_name, specialty, country_code, verified_at, revoked_at, license_expires_on'),
  ]);
  const cases = (caseRows ?? []) as CaseSummary[];
  const allPractitioners = practitionerRows ?? [];
  const practitionerName = new Map(allPractitioners.map((p) => [p.id, p.display_name]));
  const assignable = allPractitioners
    .filter((p) => isLicenceActive(p))
    .map((p) => ({ id: p.id, label: `${p.display_name} (${p.country_code})` }));

  // Keep a case's current practitioner selectable even if their licence is
  // no longer active, so the dropdown shows the truth.
  const optionsFor = (currentId: string | null) =>
    !currentId || assignable.some((a) => a.id === currentId)
      ? assignable
      : [...assignable, { id: currentId, label: `${practitionerName.get(currentId) ?? 'Practitioner'} — licence not active` }];

  const patientIds = [...new Set(cases.map((c) => c.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from('patients').select('id, full_name, country_code').in('id', patientIds)
    : { data: [] as { id: string; full_name: string; country_code: string | null }[] };
  const patientById = new Map((patients ?? []).map((p) => [p.id, p]));

  await logRecordAccess({ actorId: user.id, actorRole: session.isCeo ? 'ceo' : 'admin', action: 'view_case_list', detail: { filter, cases: cases.length } });

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Patient Records</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-6 max-w-3xl">
        Assign each consultation to a verified practitioner — they can only see cases assigned to them. Every view and
        change here is recorded in the access log.
      </p>

      {assignable.length === 0 && (
        <p className="text-sm border border-[var(--color-ochre)] bg-white rounded-lg p-4 mb-6">
          No verified practitioners yet. <Link href="/admin/practitioners" className="focus-ring font-medium text-[var(--color-forest)] hover:underline">Add and verify one</Link> before assigning cases.
        </p>
      )}

      <div className="flex gap-1 mb-4 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key} href={f.key === 'unassigned' ? '/admin/patient-cases' : `/admin/patient-cases?status=${f.key}`}
            className={`focus-ring px-3 py-1.5 rounded-md ${filter === f.key ? 'bg-[var(--color-forest)] text-white font-medium' : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-warm)]'}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {cases.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)] border border-[var(--color-border)] rounded-lg bg-white p-6">
          {filter === 'unassigned' ? 'Nothing waiting — every open case has a practitioner.' : 'No cases here.'}
        </p>
      ) : (
        <div className="border border-[var(--color-border)] rounded-lg overflow-x-auto bg-white/60">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment-warm)] text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Patient</th>
                <th className="px-4 py-2.5 font-medium">Condition</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
                <th className="px-4 py-2.5 font-medium">Practitioner</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const p = patientById.get(c.patient_id);
                return (
                  <tr key={c.id} className="border-t border-[var(--color-border)]">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/patient-cases/${c.id}`} className="focus-ring font-medium text-[var(--color-forest)] hover:underline">{p?.full_name ?? 'Patient'}</Link>
                      {p?.country_code && <span className="text-xs text-[var(--color-ink-muted)]"> · {p.country_code}</span>}
                    </td>
                    <td className="px-4 py-2.5">{c.condition}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.status} outcome={c.outcome} /></td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatRecordDate(c.started_at)}</td>
                    <td className="px-4 py-2.5">
                      {c.closed_at ? (
                        <span className="text-[var(--color-ink-soft)]">{c.practitioner_id ? practitionerName.get(c.practitioner_id) : '—'}</span>
                      ) : (
                        <CaseAssigner caseId={c.id} current={c.practitioner_id} practitioners={optionsFor(c.practitioner_id)} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
