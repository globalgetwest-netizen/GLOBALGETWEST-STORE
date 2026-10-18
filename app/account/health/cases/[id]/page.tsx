// app/account/health/cases/[id]/page.tsx
// One case, from first consultation to outcome — read-only for the patient,
// plus their own check-ins.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePatientSession } from '@/lib/health/access';
import { formatRecordDate, OUTCOME_LABELS } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { loadCaseRecord } from '@/lib/health/records';
import { CheckInForm } from '@/components/health/CheckInForm';
import { StatusBadge } from '@/components/health/StatusBadge';
import { Timeline } from '@/components/health/Timeline';

export const metadata: Metadata = { title: 'Case — My health records', robots: { index: false, follow: false } };

export default async function PatientCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requirePatientSession(`/account/health/cases/${id}`);

  const record = await loadCaseRecord(supabase, id);
  // RLS already limits this to the patient's own cases; the profile check
  // makes sure a practitioner/admin who is also a patient uses their own
  // portal for other people's records.
  if (!record || record.patient.profile_id !== user.id) notFound();

  await logRecordAccess({ actorId: user.id, actorRole: 'patient', action: 'view_case', patientId: record.patient.id, caseId: id });

  const { caseRow, practitioner, entries, categoryName } = record;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/account/health" className="focus-ring text-xs text-[var(--color-ink-soft)] hover:underline">← My health records</Link>

      <div className="mt-3 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{caseRow.condition}</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            {categoryName && <>{categoryName} · </>}Started {formatRecordDate(caseRow.started_at)}
            {caseRow.closed_at && <> · Closed {formatRecordDate(caseRow.closed_at)}</>}
          </p>
        </div>
        <StatusBadge status={caseRow.status} outcome={caseRow.outcome} />
      </div>

      <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-parchment-warm)] p-4 mb-8 text-sm">
        {practitioner ? (
          <p>
            Your practitioner: <strong>{practitioner.display_name}</strong>
            {practitioner.specialty && <>, {practitioner.specialty}</>}
            <span className="block text-xs text-[var(--color-ink-soft)] mt-0.5">
              Licence {practitioner.license_number} · {practitioner.licensing_body}
            </span>
          </p>
        ) : (
          <p className="text-[var(--color-ink-soft)]">We’re assigning a licensed practitioner to your case. They will contact you.</p>
        )}
      </div>

      {caseRow.outcome && (
        <div className="border border-[var(--color-forest)] rounded-lg bg-white p-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-forest)]">Outcome · {OUTCOME_LABELS[caseRow.outcome]}</p>
          <p className="text-sm mt-1.5 whitespace-pre-wrap">{caseRow.outcome_note}</p>
        </div>
      )}

      <h2 className="font-display text-2xl mb-5">Timeline</h2>
      <Timeline
        entries={entries}
        viewer="patient"
        correctEndpoint={caseRow.closed_at ? undefined : `/api/health/cases/${id}/entries`}
        canCorrect={(e) => e.author_role === 'patient' && e.author_id === user.id && e.kind !== 'correction'}
      />

      <div className="mt-10">
        {caseRow.closed_at ? (
          <p className="text-sm text-[var(--color-ink-soft)] border border-[var(--color-border)] rounded-lg p-4 bg-white">
            This case is closed. If something has changed, request a new consultation from your records page or contact your practitioner.
          </p>
        ) : (
          <CheckInForm caseId={id} />
        )}
      </div>
    </div>
  );
}
