// app/account/health/print/page.tsx
// A clean, printable copy of the patient's whole record. "Save as PDF" from
// the browser's print dialog gives them a PDF — no PDF library needed.
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requirePatientSession } from '@/lib/health/access';
import {
  ENTRY_KIND_LABELS, FEELING_LABELS, formatRecordDate, formatRecordDateTime, OUTCOME_LABELS, SEX_LABELS, STATUS_LABELS, isOneOf, SEXES,
} from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { CASE_COLUMNS, loadCaseRecord, PATIENT_COLUMNS, type PatientRecord } from '@/lib/health/records';
import { PrintButton } from '@/components/PrintButton';

export const metadata: Metadata = { title: 'Health record — GLOBALGETWEST', robots: { index: false, follow: false } };

export default async function PrintableRecordPage() {
  const { supabase, user } = await requirePatientSession('/account/health/print');

  const { data: patientRow } = await supabase.from('patients').select(PATIENT_COLUMNS).eq('profile_id', user.id).maybeSingle();
  const patient = patientRow as PatientRecord | null;
  if (!patient) redirect('/account/health');

  const { data: cases } = await supabase
    .from('treatment_cases')
    .select(CASE_COLUMNS)
    .eq('patient_id', patient.id)
    .order('started_at', { ascending: true });
  const records = (await Promise.all((cases ?? []).map((c) => loadCaseRecord(supabase, c.id)))).filter((r) => r !== null);

  await logRecordAccess({ actorId: user.id, actorRole: 'patient', action: 'export', patientId: patient.id, detail: { format: 'print', cases: records.length } });

  const generated = new Date().toISOString();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 print:p-0 print:max-w-none">
      <div className="print:hidden flex items-center justify-between gap-4 mb-8">
        <Link href="/account/health" className="focus-ring text-sm text-[var(--color-ink-soft)] hover:underline">← My health records</Link>
        <PrintButton label="Print / Save as PDF" />
      </div>

      <header className="border-b-2 border-[var(--color-forest)] pb-4 mb-6">
        <p className="text-xs font-semibold tracking-widest text-[var(--color-ochre)]">GLOBALGETWEST · CONFIDENTIAL HEALTH RECORD</p>
        <h1 className="font-display text-3xl mt-1">{patient.full_name}</h1>
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Field label="Date of birth" value={patient.date_of_birth ? formatRecordDate(patient.date_of_birth) : '—'} />
          <Field label="Sex" value={patient.sex && isOneOf(SEXES, patient.sex) ? SEX_LABELS[patient.sex] : '—'} />
          <Field label="Country" value={patient.country_code ?? '—'} />
          <Field label="Consent" value={`${formatRecordDate(patient.consent_given_at)} (v${patient.consent_version})`} />
        </dl>
      </header>

      {records.length === 0 && <p className="text-sm">No cases on record.</p>}

      {records.map((r) => (
        <section key={r.caseRow.id} className="mb-10 break-inside-avoid-page">
          <h2 className="font-display text-2xl">{r.caseRow.condition}</h2>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1 mb-3">
            {STATUS_LABELS[r.caseRow.status]} · Started {formatRecordDate(r.caseRow.started_at)}
            {r.caseRow.closed_at && <> · Closed {formatRecordDate(r.caseRow.closed_at)}</>}
            {r.practitioner && <> · {r.practitioner.display_name}, licence {r.practitioner.license_number} ({r.practitioner.licensing_body})</>}
          </p>
          {r.caseRow.outcome && (
            <p className="text-sm border-l-4 border-[var(--color-forest)] pl-3 mb-4">
              <strong>Outcome: {OUTCOME_LABELS[r.caseRow.outcome]}.</strong> {r.caseRow.outcome_note}
            </p>
          )}
          <table className="w-full text-sm border-collapse">
            <tbody>
              {r.entries.map((e) => (
                <tr key={e.id} className="align-top border-t border-[var(--color-border)]">
                  <td className="py-2 pr-3 w-40 text-xs text-[var(--color-ink-soft)] whitespace-nowrap">{formatRecordDateTime(e.created_at)}</td>
                  <td className="py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      {ENTRY_KIND_LABELS[e.kind]}{e.feeling && ` · Feeling: ${FEELING_LABELS[e.feeling]}`}
                      <span className="font-normal normal-case tracking-normal text-[var(--color-ink-soft)]"> — {e.author_name}</span>
                    </p>
                    <p className="whitespace-pre-wrap break-words mt-0.5">{e.body}</p>
                    {e.order_number && <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">Order {e.order_number}</p>}
                    {e.files.length > 0 && (
                      <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">Attachments: {e.files.map((f) => f.file_name).join(', ')}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <footer className="border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-ink-muted)]">
        Generated {formatRecordDateTime(generated)} for {user.email}. Entries are shown exactly as written; corrections appear as separate entries.
      </footer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
