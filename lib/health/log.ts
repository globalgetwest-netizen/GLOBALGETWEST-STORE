// lib/health/log.ts
// Every server route or page that reads or changes a health record calls
// logRecordAccess(). It records WHO did WHAT to WHICH record — never the
// record's contents. It fails closed: if the log can't be written, the read
// or change doesn't go ahead, so there is never an unlogged access.
import { supabaseServiceRole } from '@/lib/supabase/server';
import type { RecordsActorRole } from '@/lib/health/access';

export type RecordAction =
  | 'view_records'      // patient opened their own records page
  | 'view_case'
  | 'view_caseload'
  | 'view_case_list'    // admin case list
  | 'view_file'
  | 'export'
  | 'consent_given'
  | 'claim_record'
  | 'register_patient'
  | 'open_case'
  | 'request_consultation'
  | 'add_entry'
  | 'update_case'
  | 'assign_case'
  | 'reset_claim_code'
  | 'add_practitioner'
  | 'verify_practitioner'
  | 'revoke_practitioner'
  | 'erase_patient';

export interface RecordAccess {
  actorId: string;
  actorRole: RecordsActorRole;
  action: RecordAction;
  patientId?: string | null;
  caseId?: string | null;
  /** Ids and enum values only (entry id, file id, new status…). Never free text from a record. */
  detail?: Record<string, string | number | boolean | null>;
}

export async function logRecordAccess(entry: RecordAccess): Promise<void> {
  const { error } = await supabaseServiceRole().from('record_access_log').insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    action: entry.action,
    patient_id: entry.patientId ?? null,
    case_id: entry.caseId ?? null,
    detail: entry.detail ?? null,
  });
  if (error) {
    // Deliberately logs only the action name and the database error code —
    // nothing from the record itself.
    console.error(`record_access_log write failed for action "${entry.action}" (${error.code ?? 'no code'})`);
    throw new Error('Could not write the record access log');
  }
}
