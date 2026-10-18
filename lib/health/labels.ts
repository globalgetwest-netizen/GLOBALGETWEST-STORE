// lib/health/labels.ts
// Human labels for the enums in migration 017. Shared by patient,
// practitioner and admin views so every screen uses the same words.

export const CASE_STATUSES = ['intake', 'active', 'improving', 'resolved', 'discontinued', 'referred'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

/** Statuses a practitioner sets directly. The closing statuses (resolved,
 *  discontinued, referred) follow from the outcome when a case is closed. */
export const OPEN_STATUSES = ['intake', 'active', 'improving'] as const;

export const STATUS_LABELS: Record<CaseStatus, string> = {
  intake: 'Intake',
  active: 'In treatment',
  improving: 'Improving',
  resolved: 'Resolved',
  discontinued: 'Treatment ended',
  referred: 'Referred',
};

export const CASE_OUTCOMES = ['resolved', 'improved', 'no_change', 'worsened', 'referred_to_hospital', 'lost_to_follow_up'] as const;
export type CaseOutcome = (typeof CASE_OUTCOMES)[number];

export const OUTCOME_LABELS: Record<CaseOutcome, string> = {
  resolved: 'Resolved',
  improved: 'Improved',
  no_change: 'No change',
  worsened: 'Worsened',
  referred_to_hospital: 'Referred to hospital',
  lost_to_follow_up: 'Lost to follow-up',
};

export const ENTRY_KINDS = [
  'intake', 'assessment', 'plan', 'product_dispensed', 'check_in',
  'lab_result', 'note', 'outcome', 'correction',
] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  intake: 'Intake',
  assessment: 'Assessment',
  plan: 'Treatment plan',
  product_dispensed: 'Products dispensed',
  check_in: 'Check-in',
  lab_result: 'Lab result',
  note: 'Note',
  outcome: 'Outcome',
  correction: 'Correction',
};

/** Kinds a practitioner can write by hand. 'outcome' is only written by the
 *  database when a case is closed; 'correction' is started from an entry. */
export const PRACTITIONER_ENTRY_KINDS = [
  'intake', 'assessment', 'plan', 'product_dispensed', 'lab_result', 'check_in', 'note',
] as const satisfies readonly EntryKind[];

export const FEELINGS = ['much_better', 'better', 'same', 'worse', 'much_worse'] as const;
export type Feeling = (typeof FEELINGS)[number];

export const FEELING_LABELS: Record<Feeling, string> = {
  much_better: 'Much better',
  better: 'Better',
  same: 'About the same',
  worse: 'Worse',
  much_worse: 'Much worse',
};

export const SEXES = ['female', 'male', 'intersex', 'not_stated'] as const;
export type Sex = (typeof SEXES)[number];

export const SEX_LABELS: Record<Sex, string> = {
  female: 'Female',
  male: 'Male',
  intersex: 'Intersex',
  not_stated: 'Prefer not to say',
};

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

// Records are read across Africa, Europe, the US and Asia and rendered on
// the server, so times are always shown in UTC and labelled as such rather
// than silently in whatever zone the server runs in.
export function formatRecordDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatRecordDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
}
