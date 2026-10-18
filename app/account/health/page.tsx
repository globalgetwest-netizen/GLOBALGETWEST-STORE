// app/account/health/page.tsx
// The patient's own health records: consent on first visit, then every case
// with its status, plus download and consultation request.
import type { Metadata } from 'next';
import Link from 'next/link';
import { COUNTRIES } from '@/lib/countries';
import { SUPPORT_EMAIL } from '@/lib/contact';
import { requirePatientSession } from '@/lib/health/access';
import { CONSENT_SECTIONS, CONSENT_STATEMENT, CONSENT_VERSION } from '@/lib/health/consent';
import { formatRecordDate } from '@/lib/health/labels';
import { logRecordAccess } from '@/lib/health/log';
import { CASE_COLUMNS, PATIENT_COLUMNS, practitionerCards, type CaseSummary, type PatientRecord } from '@/lib/health/records';
import { ConsentScreen } from '@/components/health/ConsentScreen';
import { RequestConsultationForm } from '@/components/health/RequestConsultationForm';
import { StatusBadge } from '@/components/health/StatusBadge';

export const metadata: Metadata = { title: 'My health records — GLOBALGETWEST', robots: { index: false, follow: false } };

export default async function HealthRecordsPage() {
  const { supabase, user, fullName } = await requirePatientSession('/account/health');

  const { data: patientRow } = await supabase.from('patients').select(PATIENT_COLUMNS).eq('profile_id', user.id).maybeSingle();
  const patient = patientRow as PatientRecord | null;

  if (!patient) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <PageHeading />
        <ConsentScreen
          sections={CONSENT_SECTIONS}
          statement={CONSENT_STATEMENT}
          version={CONSENT_VERSION}
          countries={COUNTRIES.map((c) => ({ code: c.code, name: c.name }))}
          defaultName={fullName ?? ''}
          defaultCountry=""
        />
      </div>
    );
  }

  const [{ data: caseRows }, { data: categories }] = await Promise.all([
    supabase.from('treatment_cases').select(CASE_COLUMNS).eq('patient_id', patient.id).order('started_at', { ascending: false }),
    supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
  ]);
  const cases = (caseRows ?? []) as CaseSummary[];
  const cards = await practitionerCards(cases.map((c) => c.practitioner_id));

  await logRecordAccess({ actorId: user.id, actorRole: 'patient', action: 'view_records', patientId: patient.id, detail: { cases: cases.length } });

  const open = cases.filter((c) => !c.closed_at);
  const closed = cases.filter((c) => c.closed_at);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <PageHeading />

      <div className="border border-[var(--color-border)] rounded-lg bg-white p-5 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium">{patient.full_name}</p>
          <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
            {patient.date_of_birth && <>Born {formatRecordDate(patient.date_of_birth)} · </>}
            Consent given {formatRecordDate(patient.consent_given_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/health/export"
            className="focus-ring text-xs font-medium text-[var(--color-forest)] border border-[var(--color-border)] rounded px-3 py-1.5 hover:bg-[var(--color-parchment-warm)]"
          >
            Download my records (JSON)
          </a>
          <Link
            href="/account/health/print"
            className="focus-ring text-xs font-medium text-[var(--color-forest)] border border-[var(--color-border)] rounded px-3 py-1.5 hover:bg-[var(--color-parchment-warm)]"
          >
            Printable copy / PDF
          </Link>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 mb-4">
        <h2 className="font-display text-2xl">Current treatment</h2>
      </div>
      {open.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)] mb-6">You have no open cases.</p>
      ) : (
        <CaseList cases={open} cards={cards} />
      )}

      <div className="mt-6 mb-12">
        <RequestConsultationForm categories={(categories ?? []) as { id: string; name: string }[]} />
      </div>

      {closed.length > 0 && (
        <>
          <h2 className="font-display text-2xl mb-4">Past cases</h2>
          <CaseList cases={closed} cards={cards} />
        </>
      )}

      <section className="mt-14 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-ink-soft)] leading-relaxed space-y-2">
        <p>
          Only you, your assigned licensed practitioner and our administrators can see this record. It is never published
          or used as a testimonial.
        </p>
        <p>
          To ask for a correction, withdraw consent or have your record deleted, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="focus-ring text-[var(--color-forest)] font-medium hover:underline">{SUPPORT_EMAIL}</a>{' '}
          from <strong>{user.email}</strong>, or ask your practitioner.
        </p>
      </section>
    </div>
  );
}

function PageHeading() {
  return (
    <div className="mb-8">
      <Link href="/account" className="focus-ring text-xs text-[var(--color-ink-soft)] hover:underline">← Your account</Link>
      <h1 className="font-display text-3xl mt-2">My health records</h1>
    </div>
  );
}

function CaseList({ cases, cards }: { cases: CaseSummary[]; cards: Awaited<ReturnType<typeof practitionerCards>> }) {
  return (
    <ul className="space-y-3">
      {cases.map((c) => {
        const practitioner = c.practitioner_id ? cards.get(c.practitioner_id) : null;
        return (
          <li key={c.id}>
            <Link
              href={`/account/health/cases/${c.id}`}
              className="focus-ring flex items-center justify-between gap-4 border border-[var(--color-border)] rounded-lg p-4 bg-white hover:border-[var(--color-forest)] transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{c.condition}</p>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  Started {formatRecordDate(c.started_at)}
                  {c.closed_at && <> · Closed {formatRecordDate(c.closed_at)}</>}
                  {' · '}{practitioner ? practitioner.display_name : 'Awaiting a practitioner'}
                </p>
              </div>
              <StatusBadge status={c.status} outcome={c.outcome} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
