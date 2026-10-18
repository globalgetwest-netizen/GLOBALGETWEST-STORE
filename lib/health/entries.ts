// lib/health/entries.ts
// Writing one timeline entry plus its attachments, in the order that never
// leaves a half-written record behind:
//   1. files are uploaded under a pre-generated entry id
//   2. the entry is inserted with the USER's client, so RLS decides whether
//      they may write it (if not, the uploads are removed)
//   3. the file rows are recorded
import { supabaseServerClient } from '@/lib/supabase/server';
import { recordStoredFiles, removeStoredFiles, storeUploads, type ValidatedUpload } from '@/lib/health/files';
import type { EntryKind, Feeling } from '@/lib/health/labels';

type ServerClient = Awaited<ReturnType<typeof supabaseServerClient>>;

export interface NewEntry {
  kind: EntryKind;
  body: string;
  authorRole: 'practitioner' | 'patient';
  visibleToPatient?: boolean;
  orderId?: string | null;
  correctsEntryId?: string | null;
  feeling?: Feeling | null;
}

export type EntryResult = { ok: true; entryId: string; fileCount: number } | { ok: false; status: number; error: string };

export const MAX_ENTRY_LENGTH = 20000;

export async function createEntry(
  supabase: ServerClient,
  ctx: { userId: string; patientId: string; caseId: string },
  entry: NewEntry,
  uploads: ValidatedUpload[],
): Promise<EntryResult> {
  const body = entry.body.trim();
  if (!body) return { ok: false, status: 400, error: 'Please write something first' };
  if (body.length > MAX_ENTRY_LENGTH) return { ok: false, status: 400, error: 'That entry is too long' };

  const entryId = crypto.randomUUID();
  const storedResult = await storeUploads(uploads, { patientId: ctx.patientId, caseId: ctx.caseId, entryId });
  if ('error' in storedResult) return { ok: false, status: 502, error: storedResult.error };
  const { stored } = storedResult;

  const { error } = await supabase.from('case_entries').insert({
    id: entryId,
    case_id: ctx.caseId,
    kind: entry.kind,
    body,
    author_id: ctx.userId,
    author_role: entry.authorRole,
    visible_to_patient: entry.authorRole === 'patient' ? true : entry.visibleToPatient ?? true,
    order_id: entry.orderId ?? null,
    corrects_entry_id: entry.correctsEntryId ?? null,
    meta: entry.feeling ? { feeling: entry.feeling } : null,
  });

  if (error) {
    await removeStoredFiles(stored.map((s) => s.storage_path));
    // Database messages from our own triggers are written for people
    // (e.g. "This case is closed…"); RLS refusals are not, so map those.
    const status = error.code === '42501' ? 403 : 400;
    const message = error.code === '42501' ? 'You are not allowed to add this entry' : friendlyDbError(error.message);
    console.error(`case_entries insert refused (${error.code ?? 'no code'})`);
    return { ok: false, status, error: message };
  }

  const recorded = await recordStoredFiles(stored, { caseId: ctx.caseId, entryId, uploadedBy: ctx.userId });
  if (!recorded) {
    return { ok: false, status: 502, error: 'Your entry was saved, but the attachments could not be added. Please add them again in a new entry.' };
  }
  return { ok: true, entryId, fileCount: stored.length };
}

const TRIGGER_MESSAGES = [
  'This case is closed',
  'A correction must refer',
  'Patients can only correct',
  'That order does not belong',
  'Cases can only be assigned',
  'Only an administrator',
  'Reopen it before',
  'Close the case with an outcome',
  'A case cannot be moved',
];

/** Passes through the human-written messages raised by migration 017's
 *  triggers; anything else becomes a generic message. */
export function friendlyDbError(message: string): string {
  return TRIGGER_MESSAGES.some((m) => message.startsWith(m)) ? message : 'That could not be saved. Please check the details and try again.';
}
