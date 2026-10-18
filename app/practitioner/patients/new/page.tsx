// app/practitioner/patients/new/page.tsx
import { COUNTRIES } from '@/lib/countries';
import { requirePractitionerSession } from '@/lib/health/access';
import { CONSENT_SECTIONS, PRACTITIONER_CONSENT_STATEMENT } from '@/lib/health/consent';
import { MfaRequired } from '@/components/health/MfaRequired';
import { NewPatientForm } from '@/components/health/NewPatientForm';

export default async function NewPatientPage() {
  const session = await requirePractitionerSession();
  if (!session.mfaVerified) return <MfaRequired hasFactor={session.hasMfaFactor} next="/practitioner/patients/new" audience="practitioner" />;

  const { data: categories } = await session.supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order');
  // The short version of each consent section, for the practitioner to explain out loud.
  const consentPoints = CONSENT_SECTIONS.slice(0, 4).map((s) => `${s.heading}: ${s.points[0]}`);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl mb-2">Register a patient</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-8">
        For someone you consulted in person, by phone or on WhatsApp. If they already have an account and asked for a
        consultation online, their case will be assigned to you by an administrator instead — don’t register them twice.
      </p>
      <NewPatientForm
        countries={COUNTRIES.map((c) => ({ code: c.code, name: c.name }))}
        categories={(categories ?? []) as { id: string; name: string }[]}
        consentStatement={PRACTITIONER_CONSENT_STATEMENT}
        consentPoints={consentPoints}
      />
    </div>
  );
}
