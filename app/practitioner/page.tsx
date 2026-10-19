// app/practitioner/page.tsx
// The practitioner's caseload — only cases assigned to them (RLS).
import Link from 'next/link';
import { requirePractitionerSession } from '@/lib/health/access';
import { formatRecordDate } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { CASE_COLUMNS, type CaseSummary } from '@/lib/health/records';
import { MfaRequired } from '@/components/health/MfaRequired';
import { StatusBadge } from '@/components/health/StatusBadge';

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
] as const;

export default async function CaseloadPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requirePractitionerSession();
  if (!session.mfaVerified) return <MfaRequired hasFactor={session.hasMfaFactor} next="/practitioner" audience="practitioner" />;

  const { supabase, user, practitioner } = session;
  const { status } = await searchParams;
  const filter = FILTERS.some((f) => f.key === status) ? status! : 'open';

  let query = supabase
    .from('treatment_cases')
    .select(CASE_COLUMNS)
    .eq('practitioner_id', practitioner.id)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (filter === 'open') query = query.is('closed_at', null);
  if (filter === 'closed') query = query.not('closed_at', 'is', null);
  const { data: caseRows } = await query;
  const cases = (caseRows ?? []) as CaseSummary[];

  const patientIds = [...new Set(cases.map((c) => c.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from('patients').select('id, full_name, country_code').in('id', patientIds)
    : { data: [] as { id: string; full_name: string; country_code: string | null }[] };
  const patientById = new Map((patients ?? []).map((p) => [p.id, p]));

  // Latest timeline activity per case (entries, not just case-row edits).
  const { data: recent } = cases.length
    ? await supabase.from('case_entries').select('case_id, created_at').in('case_id', cases.map((c) => c.id)).order('created_at', { ascending: false }).limit(2000)
    : { data: [] as { case_id: string; created_at: string }[] };
  const lastActivity = new Map<string, string>();
  for (const r of recent ?? []) if (!lastActivity.has(r.case_id)) lastActivity.set(r.case_id, r.created_at);
  const activityOf = (c: CaseSummary) => lastActivity.get(c.id) ?? c.updated_at;
  cases.sort((a, b) => activityOf(b).localeCompare(activityOf(a)));

  await logRecordAccess({ actorId: user.id, actorRole: 'practitioner', action: 'view_caseload', detail: { filter, cases: cases.length } });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl">My caseload</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">Cases assigned to you. Open one to read the timeline and add entries.</p>
        </div>
        <Link href="/practitioner/patients/new" className="btn btn-primary">
          Register a patient
        </Link>
      </div>

      <div className="flex gap-1 mb-4 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key} href={f.key === 'open' ? '/practitioner' : `/practitioner?status=${f.key}`}
            className={`focus-ring px-3 py-1.5 rounded-md ${filter === f.key ? 'bg-[var(--color-forest)] text-white font-medium' : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-warm)]'}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {cases.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)] border border-[var(--color-border)] rounded-lg bg-white p-6">
          {filter === 'open' ? 'No open cases. New consultation requests appear here once an administrator assigns them to you.' : 'No cases here.'}
        </p>
      ) : (
        <div className="border border-[var(--color-border)] rounded-lg overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment-warm)] text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Patient</th>
                <th className="px-4 py-2.5 font-medium">Condition</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
                <th className="px-4 py-2.5 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const p = patientById.get(c.patient_id);
                return (
                  <tr key={c.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-parchment-warm)]">
                    <td className="px-4 py-2.5">
                      <Link href={`/practitioner/cases/${c.id}`} className="focus-ring font-medium text-[var(--color-forest)] hover:underline">
                        {p?.full_name ?? 'Patient'}
                      </Link>
                      {p?.country_code && <span className="text-xs text-[var(--color-ink-muted)]"> · {p.country_code}</span>}
                    </td>
                    <td className="px-4 py-2.5">{c.condition}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.status} outcome={c.outcome} /></td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatRecordDate(c.started_at)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatRecordDate(activityOf(c))}</td>
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
