// app/practitioner/cases/[id]/page.tsx
// A case assigned to this practitioner: patient details, timeline, new
// entries, status and outcome.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatUsd } from '@/lib/format';
import { requirePractitionerSession } from '@/lib/health/access';
import { formatRecordDate, isOneOf, SEX_LABELS, SEXES } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { CASE_COLUMNS, eligibleOrdersForPatient, loadCaseRecord, type CaseSummary } from '@/lib/health/records';
import { CaseControls } from '@/components/health/CaseControls';
import { EntryForm } from '@/components/health/EntryForm';
import { MfaRequired } from '@/components/health/MfaRequired';
import { ClaimCodeReset, NewCaseForm } from '@/components/health/PatientPanel';
import { StatusBadge } from '@/components/health/StatusBadge';
import { Timeline } from '@/components/health/Timeline';

function ageFrom(dob: string): number {
  const d = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export default async function PractitionerCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePractitionerSession();
  if (!session.mfaVerified) return <MfaRequired hasFactor={session.hasMfaFactor} next={`/practitioner/cases/${id}`} audience="practitioner" />;

  const { supabase, user, practitioner } = session;
  const record = await loadCaseRecord(supabase, id);
  if (!record || record.caseRow.practitioner_id !== practitioner.id) notFound();

  const { patient, caseRow, entries, categoryName } = record;

  const [{ data: otherCases }, { data: categories }, orders] = await Promise.all([
    supabase.from('treatment_cases').select(CASE_COLUMNS).eq('patient_id', patient.id).neq('id', id).order('started_at', { ascending: false }),
    supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
    eligibleOrdersForPatient(patient),
  ]);

  await logRecordAccess({ actorId: user.id, actorRole: 'practitioner', action: 'view_case', patientId: patient.id, caseId: id });

  return (
    <div>
      <Link href="/practitioner" className="focus-ring text-xs text-[var(--color-ink-soft)] hover:underline">← My caseload</Link>

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
        <div className="min-w-0 space-y-8">
          <Timeline
            entries={entries}
            viewer="practitioner"
            correctEndpoint={`/api/practitioner/cases/${id}/entries`}
            canCorrect={(e) => !e.event}
          />
          <EntryForm
            caseId={id}
            orders={orders.map((o) => ({
              id: o.id,
              label: `${o.order_number} · ${formatRecordDate(o.created_at)} · ${formatUsd(o.total_usd_cents)} · ${o.status.replace(/_/g, ' ')}`,
            }))}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <CaseControls caseId={id} status={caseRow.status} outcome={caseRow.outcome} condition={caseRow.condition} />

          <div className="border border-[var(--color-border)] rounded-lg bg-white p-5 text-sm space-y-2">
            <h3 className="font-display text-xl mb-1">Patient</h3>
            <Detail label="Age" value={patient.date_of_birth ? `${ageFrom(patient.date_of_birth)} (born ${formatRecordDate(patient.date_of_birth)})` : 'Not recorded'} />
            <Detail label="Sex" value={patient.sex && isOneOf(SEXES, patient.sex) ? SEX_LABELS[patient.sex] : 'Not recorded'} />
            <Detail label="Country" value={patient.country_code ?? '—'} />
            <Detail label="Phone" value={patient.phone ?? '—'} />
            <Detail label="Email" value={patient.email ?? '—'} />
            <Detail
              label="Consent"
              value={`${formatRecordDate(patient.consent_given_at)} · ${patient.consent_method === 'self_online' ? 'given online by patient' : 'recorded by practitioner'}`}
            />
            <div className="pt-2">
              {patient.profile_id ? (
                <p className="text-xs text-[var(--color-ink-soft)]">Linked to the patient’s account — they can read this record and add check-ins.</p>
              ) : (
                <ClaimCodeReset patientId={patient.id} />
              )}
            </div>
          </div>

          <div className="border border-[var(--color-border)] rounded-lg bg-white p-5 text-sm">
            <h3 className="font-display text-xl mb-3">Other cases</h3>
            {(otherCases ?? []).length === 0 ? (
              <p className="text-xs text-[var(--color-ink-soft)] mb-3">No other cases with you.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {((otherCases ?? []) as CaseSummary[]).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <Link href={`/practitioner/cases/${c.id}`} className="focus-ring text-[var(--color-forest)] hover:underline truncate">{c.condition}</Link>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
            <NewCaseForm patientId={patient.id} categories={(categories ?? []) as { id: string; name: string }[]} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-[var(--color-ink-soft)] shrink-0">{label}</span>
      <span className="text-right break-all">{value}</span>
    </p>
  );
}
