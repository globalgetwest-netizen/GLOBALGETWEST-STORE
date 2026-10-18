// lib/health/records.ts
// Loading a case and its timeline. All record reads go through the signed-in
// user's own Supabase client, so RLS decides what comes back (a patient never
// receives private notes; a practitioner never receives someone else's case).
// The service role is used only to turn author ids into display names.
import { supabaseServerClient, supabaseServiceRole } from '@/lib/supabase/server';
import type { CaseOutcome, CaseStatus, EntryKind, Feeling } from '@/lib/health/labels';

type ServerClient = Awaited<ReturnType<typeof supabaseServerClient>>;

export interface PatientRecord {
  id: string;
  profile_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  country_code: string | null;
  consent_given_at: string;
  consent_version: string;
  consent_method: 'self_online' | 'recorded_by_practitioner';
  created_at: string;
}

export const PATIENT_COLUMNS =
  'id, profile_id, full_name, date_of_birth, sex, phone, email, country_code, consent_given_at, consent_version, consent_method, created_at';

export interface CaseSummary {
  id: string;
  patient_id: string;
  condition: string;
  category_id: string | null;
  practitioner_id: string | null;
  status: CaseStatus;
  started_at: string;
  closed_at: string | null;
  outcome: CaseOutcome | null;
  outcome_note: string | null;
  updated_at: string;
}

export const CASE_COLUMNS =
  'id, patient_id, condition, category_id, practitioner_id, status, started_at, closed_at, outcome, outcome_note, updated_at';

export interface EntryFile {
  id: string;
  entry_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}

export interface TimelineEntry {
  id: string;
  kind: EntryKind;
  body: string;
  author_id: string | null;
  author_role: 'practitioner' | 'patient' | 'admin';
  author_name: string;
  order_id: string | null;
  order_number: string | null;
  corrects_entry_id: string | null;
  visible_to_patient: boolean;
  feeling: Feeling | null;
  /** Set on entries the database writes itself: 'assigned', 'status_changed', 'case_closed', 'case_reopened', 'condition_changed'. */
  event: string | null;
  eventMeta: Record<string, string | null> | null;
  created_at: string;
  files: EntryFile[];
}

export interface CaseRecord {
  patient: PatientRecord;
  caseRow: CaseSummary;
  categoryName: string | null;
  practitioner: PractitionerCard | null;
  entries: TimelineEntry[];
}

export interface PractitionerCard {
  id: string;
  display_name: string;
  specialty: string | null;
  licensing_body: string;
  license_number: string;
  country_code: string;
}

/** Display details for practitioners on cases the caller can already see.
 *  Patients can't read the practitioners table, so this goes through the
 *  service role — and only ever for ids taken from RLS-filtered cases. */
export async function practitionerCards(ids: (string | null)[]): Promise<Map<string, PractitionerCard>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const map = new Map<string, PractitionerCard>();
  if (unique.length === 0) return map;
  const { data } = await supabaseServiceRole()
    .from('practitioners')
    .select('id, display_name, specialty, licensing_body, license_number, country_code')
    .in('id', unique);
  for (const p of data ?? []) map.set(p.id, p as PractitionerCard);
  return map;
}

/** Returns null when the case doesn't exist OR the caller may not see it —
 *  RLS makes those indistinguishable, which is the point. */
export async function loadCaseRecord(supabase: ServerClient, caseId: string): Promise<CaseRecord | null> {
  if (!isUuid(caseId)) return null;

  const { data: caseRow } = await supabase.from('treatment_cases').select(CASE_COLUMNS).eq('id', caseId).maybeSingle();
  if (!caseRow) return null;

  const [{ data: patient }, { data: entries }, { data: files }, { data: category }] = await Promise.all([
    supabase.from('patients').select(PATIENT_COLUMNS).eq('id', caseRow.patient_id).maybeSingle(),
    supabase
      .from('case_entries')
      .select('id, kind, body, author_id, author_role, order_id, corrects_entry_id, visible_to_patient, meta, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    supabase.from('case_entry_files').select('id, entry_id, file_name, mime_type, size_bytes').eq('case_id', caseId),
    caseRow.category_id
      ? supabase.from('categories').select('name').eq('id', caseRow.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!patient) return null;

  const rows = entries ?? [];
  const svc = supabaseServiceRole();

  const authorIds = [...new Set(rows.map((e) => e.author_id).filter((id): id is string => !!id))];
  const orderIds = [...new Set(rows.map((e) => e.order_id).filter((id): id is string => !!id))];

  const [cards, { data: authorPractitioners }, { data: orders }] = await Promise.all([
    practitionerCards([caseRow.practitioner_id]),
    authorIds.length
      ? svc.from('practitioners').select('profile_id, display_name').in('profile_id', authorIds)
      : Promise.resolve({ data: [] as { profile_id: string; display_name: string }[] }),
    orderIds.length
      ? svc.from('orders').select('id, order_number').in('id', orderIds)
      : Promise.resolve({ data: [] as { id: string; order_number: string }[] }),
  ]);

  const practitionerNames = new Map((authorPractitioners ?? []).map((p) => [p.profile_id, p.display_name]));
  const orderNumbers = new Map((orders ?? []).map((o) => [o.id, o.order_number]));
  const filesByEntry = new Map<string, EntryFile[]>();
  for (const f of (files ?? []) as EntryFile[]) {
    filesByEntry.set(f.entry_id, [...(filesByEntry.get(f.entry_id) ?? []), f]);
  }

  const timeline: TimelineEntry[] = rows.map((e) => {
    const meta = (e.meta ?? null) as ({ feeling?: Feeling; event?: string } & Record<string, string | null>) | null;
    const isSystemEvent = e.author_role !== 'patient' && !!meta?.event;
    let authorName: string;
    if (e.author_role === 'patient') authorName = patient.full_name;
    else if (e.author_role === 'admin') authorName = 'GLOBALGETWEST administrator';
    else authorName = (e.author_id && practitionerNames.get(e.author_id)) || 'Practitioner';

    return {
      id: e.id,
      kind: e.kind,
      body: e.body,
      author_id: e.author_id,
      author_role: e.author_role,
      author_name: authorName,
      order_id: e.order_id,
      order_number: e.order_id ? orderNumbers.get(e.order_id) ?? null : null,
      corrects_entry_id: e.corrects_entry_id,
      visible_to_patient: e.visible_to_patient,
      // Patients may only set meta.feeling; events come from the database
      // itself (RLS forbids anyone else writing them), so both are safe to read.
      feeling: meta?.feeling ?? null,
      event: isSystemEvent ? meta?.event ?? null : null,
      eventMeta: isSystemEvent ? meta : null,
      created_at: e.created_at,
      files: filesByEntry.get(e.id) ?? [],
    };
  });

  return {
    patient: patient as PatientRecord,
    caseRow: caseRow as CaseSummary,
    categoryName: category?.name ?? null,
    practitioner: caseRow.practitioner_id ? cards.get(caseRow.practitioner_id) ?? null : null,
    entries: timeline,
  };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export interface EligibleOrder {
  id: string;
  order_number: string;
  status: string;
  total_usd_cents: number;
  created_at: string;
}

/** Orders a practitioner may link as "products dispensed" — the same rule
 *  the database enforces: the patient's own account, or orders placed with
 *  the patient's email. Only call after RLS has confirmed case access. */
export async function eligibleOrdersForPatient(patient: Pick<PatientRecord, 'profile_id' | 'email'>): Promise<EligibleOrder[]> {
  const svc = supabaseServiceRole();
  const columns = 'id, order_number, status, total_usd_cents, created_at';
  const queries: PromiseLike<{ data: EligibleOrder[] | null }>[] = [];

  if (patient.profile_id) {
    queries.push(svc.from('orders').select(columns).eq('customer_id', patient.profile_id).order('created_at', { ascending: false }).limit(25));
  }
  if (patient.email) {
    const email = patient.email.trim().toLowerCase();
    queries.push(svc.from('orders').select(columns).ilike('contact_email', escapeLike(email)).order('created_at', { ascending: false }).limit(25));
    const { data: profile } = await svc.from('profiles').select('id').ilike('email', escapeLike(email)).maybeSingle();
    if (profile && profile.id !== patient.profile_id) {
      queries.push(svc.from('orders').select(columns).eq('customer_id', profile.id).order('created_at', { ascending: false }).limit(25));
    }
  }

  const results = await Promise.all(queries);
  const byId = new Map<string, EligibleOrder>();
  for (const r of results) for (const o of r.data ?? []) byId.set(o.id, o);
  return [...byId.values()]
    .filter((o) => o.status !== 'cancelled')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
