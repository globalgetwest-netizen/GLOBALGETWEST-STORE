'use client';
// components/health/FileInput.tsx
// Photo / PDF picker for record entries. Phone photos are often 3–8 MB, and
// a request can carry at most ~4 MB, so JPEG/PNG/WEBP photos are downscaled
// in the browser (longest side 2000 px) before upload. PDFs and HEIC files
// are sent as they are.
import { useId, useState } from 'react';

const MAX_FILES = 4;
const MAX_TOTAL = 4 * 1024 * 1024;
const MAX_SIDE = 2000;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf';

async function shrinkPhoto(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function FileInput({ files, onChange, label = 'Photos or documents (optional)' }: {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
}) {
  const id = useId();
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  async function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError('');
    setWorking(true);
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        setError(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      next.push(await shrinkPhoto(f));
    }
    const total = next.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL) {
      setError('These files are too large together — please keep them under 4 MB in total.');
    } else {
      onChange(next);
    }
    setWorking(false);
  }

  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id} type="file" multiple accept={ACCEPT}
        onChange={(e) => { add(e.target.files); e.target.value = ''; }}
        className="field"
      />
      <p className="text-xs text-[var(--color-ink-muted)] mt-1">JPG, PNG, WEBP, HEIC or PDF · up to {MAX_FILES} files · private to your record</p>
      {working && <p className="text-xs text-[var(--color-ink-soft)] mt-1">Preparing files…</p>}
      {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 text-xs border border-[var(--color-border)] rounded px-2.5 py-1.5 bg-white">
              <span className="truncate">{f.name} <span className="text-[var(--color-ink-muted)]">· {(f.size / 1024 / 1024).toFixed(1)} MB</span></span>
              <button
                type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="focus-ring text-[var(--color-danger)] hover:underline shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
