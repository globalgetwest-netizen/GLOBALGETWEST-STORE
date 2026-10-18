// lib/health/files.ts
// Attachments (check-in photos, lab reports) for case entries. They live in
// the private 'patient-files' bucket, which has no storage policies at all —
// only this server code, using the service role after RLS has confirmed
// access, can put files there or hand out a link to one.
import { supabaseServiceRole } from '@/lib/supabase/server';

export const PATIENT_FILES_BUCKET = 'patient-files';
export const MAX_FILES_PER_ENTRY = 4;
// Vercel caps a request body at 4.5 MB, so the whole upload has to fit in
// that. Photos are downscaled in the browser before upload (see
// components/health/FileInput.tsx), which keeps phone photos well under it.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const SIGNED_URL_SECONDS = 60;

const KINDS: { mime: string; ext: string; matches: (b: Uint8Array) => boolean }[] = [
  { mime: 'image/jpeg', ext: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/webp', ext: 'webp', matches: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP' },
  { mime: 'application/pdf', ext: 'pdf', matches: (b) => ascii(b, 0, 5) === '%PDF-' },
  {
    mime: 'image/heic', ext: 'heic',
    matches: (b) => ascii(b, 4, 8) === 'ftyp' && ['heic', 'heix', 'heim', 'heis', 'mif1', 'msf1', 'hevc'].includes(ascii(b, 8, 12)),
  },
];

function ascii(b: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...b.subarray(start, end));
}

export interface ValidatedUpload {
  file: File;
  bytes: Uint8Array;
  mime: string;
  ext: string;
}

/** Reads `files` from a form and checks them by their actual bytes, not the
 *  type the browser claims. */
export async function readUploads(form: FormData): Promise<{ uploads: ValidatedUpload[] } | { error: string }> {
  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES_PER_ENTRY) return { error: `You can attach up to ${MAX_FILES_PER_ENTRY} files` };

  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_UPLOAD_BYTES) return { error: 'Attachments are too large — please keep them under 4 MB in total' };

  const uploads: ValidatedUpload[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = KINDS.find((k) => k.matches(bytes));
    if (!kind) return { error: `"${file.name}" isn't a supported file — use a photo (JPG, PNG, WEBP, HEIC) or a PDF` };
    uploads.push({ file, bytes, mime: kind.mime, ext: kind.ext });
  }
  return { uploads };
}

export interface StoredFile {
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}

export async function storeUploads(
  uploads: ValidatedUpload[],
  where: { patientId: string; caseId: string; entryId: string },
): Promise<{ stored: StoredFile[] } | { error: string }> {
  const storage = supabaseServiceRole().storage.from(PATIENT_FILES_BUCKET);
  const stored: StoredFile[] = [];

  for (const u of uploads) {
    const path = `${where.patientId}/${where.caseId}/${where.entryId}/${crypto.randomUUID()}.${u.ext}`;
    const { error } = await storage.upload(path, u.bytes, { contentType: u.mime, upsert: false });
    if (error) {
      await removeStoredFiles(stored.map((s) => s.storage_path));
      console.error('patient-files upload failed');
      return { error: 'Could not upload the attachments. Please try again.' };
    }
    stored.push({
      storage_path: path,
      file_name: cleanFileName(u.file.name, u.ext),
      mime_type: u.mime,
      size_bytes: u.bytes.byteLength,
    });
  }
  return { stored };
}

export async function removeStoredFiles(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const storage = supabaseServiceRole().storage.from(PATIENT_FILES_BUCKET);
  // The Storage API removes at most 1000 objects per call.
  for (let i = 0; i < paths.length; i += 1000) {
    const { error } = await storage.remove(paths.slice(i, i + 1000));
    if (error) {
      console.error('patient-files removal failed');
      return false;
    }
  }
  return true;
}

/** Inserts the case_entry_files rows for files already in storage. If that
 *  fails, the uploaded objects are removed so nothing is left orphaned. */
export async function recordStoredFiles(
  stored: StoredFile[],
  where: { caseId: string; entryId: string; uploadedBy: string },
): Promise<boolean> {
  if (stored.length === 0) return true;
  const { error } = await supabaseServiceRole().from('case_entry_files').insert(
    stored.map((s) => ({ ...s, case_id: where.caseId, entry_id: where.entryId, uploaded_by: where.uploadedBy })),
  );
  if (error) {
    await removeStoredFiles(stored.map((s) => s.storage_path));
    console.error(`case_entry_files insert failed (${error.code ?? 'no code'})`);
    return false;
  }
  return true;
}

export async function signedFileUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseServiceRole()
    .storage.from(PATIENT_FILES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

function cleanFileName(name: string, ext: string): string {
  const base = name.replace(/\.[^.]*$/, '').replace(/[^\w\- ]+/g, '').trim().slice(0, 80);
  return `${base || 'attachment'}.${ext}`;
}
