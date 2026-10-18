'use client';
// components/health/CheckInForm.tsx
// The patient's own update on a case: how they feel, what's changed, photos.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FEELINGS, FEELING_LABELS } from '@/lib/health/labels';
import { FileInput } from '@/components/health/FileInput';

export function CheckInForm({ caseId }: { caseId: string }) {
  const [feeling, setFeeling] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData();
    form.set('body', body);
    if (feeling) form.set('feeling', feeling);
    files.forEach((f) => form.append('files', f));
    try {
      const res = await fetch(`/api/health/cases/${caseId}/entries`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Your check-in could not be saved');
      setBody('');
      setFeeling('');
      setFiles([]);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-[var(--color-border)] rounded-lg bg-white p-5 space-y-4">
      <div>
        <h3 className="font-display text-xl">Add a check-in</h3>
        <p className="text-xs text-[var(--color-ink-soft)] mt-1">Your practitioner reads these. Check-ins can’t be edited later — you can add a correction if needed.</p>
      </div>

      <fieldset>
        <legend className="block text-sm font-medium mb-2">How are you feeling compared with last time?</legend>
        <div className="flex flex-wrap gap-2">
          {FEELINGS.map((f) => (
            <label
              key={f}
              className={`cursor-pointer text-sm rounded-full border px-3 py-1.5 transition-colors ${feeling === f ? 'bg-[var(--color-charcoal)] text-white border-[var(--color-charcoal)]' : 'bg-white border-[var(--color-border)] hover:bg-[var(--color-parchment-warm)]'}`}
            >
              <input type="radio" name="feeling" value={f} checked={feeling === f} onChange={() => setFeeling(f)} className="sr-only" />
              {FEELING_LABELS[f]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`checkin-${caseId}`} className="block text-sm font-medium mb-1.5">Symptoms and anything you’ve noticed</label>
        <textarea
          id={`checkin-${caseId}`} required rows={4} maxLength={20000} value={body} onChange={(e) => { setBody(e.target.value); setDone(false); }}
          placeholder="e.g. Less tired this week. Taking the tonic twice a day as advised."
          className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        />
      </div>

      <FileInput files={files} onChange={setFiles} label="Photos (optional)" />

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {done && <p className="text-sm text-[#2F5D3A]">Thank you — your check-in has been added.</p>}

      <button
        type="submit" disabled={saving || !body.trim()}
        className="focus-ring bg-[var(--color-charcoal)] text-white font-semibold px-5 py-2.5 rounded hover:bg-black disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Add check-in'}
      </button>
    </form>
  );
}
