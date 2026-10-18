// lib/health/access.ts
// Who is asking for a health record, and are they allowed to. This is the
// app-side layer; RLS in migration 017 is the real boundary (it checks the
// same things — verified licence, MFA, assignment — inside the database), so
// a mistake here fails closed rather than leaking.
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { supabaseServerClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof supabaseServerClient>>;

export type RecordsActorRole = 'patient' | 'practitioner' | 'admin' | 'ceo';

export interface PractitionerRow {
  id: string;
  profile_id: string;
  display_name: string;
  specialty: string | null;
  license_number: string;
  licensing_body: string;
  country_code: string;
  license_expires_on: string | null;
  verified_at: string | null;
  revoked_at: string | null;
}

export interface RecordsSession {
  supabase: ServerClient;
  user: User;
  /** True when this session passed two-step verification (aal2). */
  mfaVerified: boolean;
  /** True when the account has a verified authenticator app enrolled. */
  hasMfaFactor: boolean;
  role: string | null;
  fullName: string | null;
  isActiveProfile: boolean;
  practitioner: PractitionerRow | null;
  /** Licence verified, not revoked, not expired, profile active. MFA is checked separately. */
  isActivePractitioner: boolean;
  isAdmin: boolean;
  isCeo: boolean;
}

const PRACTITIONER_COLUMNS =
  'id, profile_id, display_name, specialty, license_number, licensing_body, country_code, license_expires_on, verified_at, revoked_at';

export function isLicenceActive(p: Pick<PractitionerRow, 'verified_at' | 'revoked_at' | 'license_expires_on'>): boolean {
  if (!p.verified_at || p.revoked_at) return false;
  if (p.license_expires_on && p.license_expires_on < new Date().toISOString().slice(0, 10)) return false;
  return true;
}

/** Null when signed out or on an anonymous guest-checkout session. */
export async function getRecordsSession(): Promise<RecordsSession | null> {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return null;

  // getClaims() verifies the access token; aal comes from the verified JWT,
  // which is exactly what RLS's has_aal2() reads.
  const [{ data: claimsData }, { data: profile }, { data: practitioner }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from('profiles').select('role, is_active, full_name').eq('id', user.id).maybeSingle(),
    supabase.from('practitioners').select(PRACTITIONER_COLUMNS).eq('profile_id', user.id).maybeSingle(),
  ]);

  const role = (profile?.role as string | undefined) ?? null;
  const isActiveProfile = profile?.is_active === true;
  const practitionerRow = (practitioner as PractitionerRow | null) ?? null;

  return {
    supabase,
    user,
    mfaVerified: claimsData?.claims?.aal === 'aal2',
    hasMfaFactor: (user.factors ?? []).some((f) => f.status === 'verified'),
    role,
    fullName: profile?.full_name ?? null,
    isActiveProfile,
    practitioner: practitionerRow,
    isActivePractitioner: isActiveProfile && practitionerRow !== null && isLicenceActive(practitionerRow),
    isAdmin: isActiveProfile && (role === 'admin' || role === 'ceo'),
    isCeo: isActiveProfile && role === 'ceo',
  };
}

// ---------------------------------------------------------------- pages

export async function requirePatientSession(next: string): Promise<RecordsSession> {
  const session = await getRecordsSession();
  if (!session) redirect(`/account/sign-in?next=${encodeURIComponent(next)}`);
  return session;
}

/** Practitioner pages. Returns the session even without MFA so the layout
 *  can show the "turn on two-step sign-in" screen instead of the records. */
export async function requirePractitionerSession(): Promise<RecordsSession & { practitioner: PractitionerRow }> {
  const session = await getRecordsSession();
  if (!session) redirect('/account/sign-in?next=/practitioner');
  if (!session.isActivePractitioner || !session.practitioner) redirect('/account');
  return session as RecordsSession & { practitioner: PractitionerRow };
}

/** Admin patient-record pages (inside the admin layout, which already
 *  requires admin/CEO). Returns the session even without MFA so the page
 *  can show the "turn on two-step sign-in" screen. */
export async function requireRecordsAdminSession(): Promise<RecordsSession> {
  const session = await getRecordsSession();
  if (!session) redirect('/account/sign-in?next=/admin');
  if (!session.isAdmin) redirect('/account');
  return session;
}

// ---------------------------------------------------------------- API routes

type ApiResult<T> = { ok: true; session: T } | { ok: false; response: NextResponse };

function deny(status: number, error: string): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

export async function apiPatientSession(): Promise<ApiResult<RecordsSession>> {
  const session = await getRecordsSession();
  if (!session) return deny(401, 'Please sign in to your account first');
  return { ok: true, session };
}

export async function apiPractitionerSession(): Promise<ApiResult<RecordsSession & { practitioner: PractitionerRow }>> {
  const session = await getRecordsSession();
  if (!session) return deny(401, 'Not authenticated');
  if (!session.isActivePractitioner || !session.practitioner) return deny(403, 'Only verified practitioners can do this');
  if (!session.mfaVerified) return deny(403, 'Two-step sign-in is required to work with patient records');
  return { ok: true, session: session as RecordsSession & { practitioner: PractitionerRow } };
}

export async function apiRecordsAdminSession(opts: { ceoOnly?: boolean } = {}): Promise<ApiResult<RecordsSession>> {
  const session = await getRecordsSession();
  if (!session) return deny(401, 'Not authenticated');
  if (opts.ceoOnly ? !session.isCeo : !session.isAdmin) return deny(403, 'Not allowed');
  if (!session.mfaVerified) return deny(403, 'Two-step sign-in is required to work with patient records');
  return { ok: true, session };
}

export function actorRoleFor(session: RecordsSession, context: 'patient' | 'practitioner' | 'admin'): RecordsActorRole {
  if (context === 'admin') return session.isCeo ? 'ceo' : 'admin';
  return context;
}
