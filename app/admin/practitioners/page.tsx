// app/admin/practitioners/page.tsx
import { COUNTRIES } from '@/lib/countries';
import { requireRecordsAdminSession } from '@/lib/health/access';
import { MfaRequired } from '@/components/health/MfaRequired';
import { PractitionerManager, type PractitionerListItem } from '@/components/admin/PractitionerManager';

export default async function AdminPractitionersPage() {
  const session = await requireRecordsAdminSession();
  if (!session.mfaVerified) return <MfaRequired hasFactor={session.hasMfaFactor} next="/admin/practitioners" audience="admin" />;
  const { supabase, user } = session;

  const { data: rows } = await supabase
    .from('practitioners')
    .select('id, profile_id, display_name, specialty, license_number, licensing_body, country_code, license_expires_on, verified_at, revoked_at, revoked_reason, created_at')
    .order('created_at', { ascending: false });
  const practitioners = rows ?? [];

  const profileIds = practitioners.map((p) => p.profile_id);
  const [{ data: profiles }, { data: openCases }] = await Promise.all([
    profileIds.length
      ? supabase.from('profiles').select('id, email').in('id', profileIds)
      : Promise.resolve({ data: [] as { id: string; email: string | null }[] }),
    practitioners.length
      ? supabase.from('treatment_cases').select('practitioner_id').is('closed_at', null).in('practitioner_id', practitioners.map((p) => p.id))
      : Promise.resolve({ data: [] as { practitioner_id: string }[] }),
  ]);
  const emails = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const counts = new Map<string, number>();
  for (const c of openCases ?? []) counts.set(c.practitioner_id, (counts.get(c.practitioner_id) ?? 0) + 1);

  const items: PractitionerListItem[] = practitioners.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    specialty: p.specialty,
    license_number: p.license_number,
    licensing_body: p.licensing_body,
    country_code: p.country_code,
    license_expires_on: p.license_expires_on,
    verified_at: p.verified_at,
    revoked_at: p.revoked_at,
    revoked_reason: p.revoked_reason,
    email: emails.get(p.profile_id) ?? null,
    is_self: p.profile_id === user.id,
    open_cases: counts.get(p.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Practitioners</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8 max-w-3xl">
        Only licensed practitioners write and sign patient records. Add a practitioner by their account email, then verify
        the licence after checking it with the licensing body. Revoking takes away access to every record immediately;
        their past entries stay on the record under their name.
      </p>
      <PractitionerManager initial={items} countries={COUNTRIES.map((c) => ({ code: c.code, name: c.name }))} />
    </div>
  );
}
