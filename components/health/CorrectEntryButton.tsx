'use client';
// components/health/CorrectEntryButton.tsx
// Entries can't be edited. "Add correction" writes a new entry that points
// at this one; the original stays visible, marked as corrected.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CorrectEntryButton({ endpoint, entryId }: { endpoint: string; entryId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData();
    form.set('correctsEntryId', entryId);
    form.set('body', text);
    try {
      const res = await fetch(endpoint, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'The correction could not be saved');
      setOpen(false);
      setText('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="focus-ring text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-danger)] hover:underline">
        Add correction
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full mt-2 space-y-2">
      <label className="block text-xs font-medium text-[var(--color-ink)]">
        What should it say? The original stays on the record, marked as corrected.
      </label>
      <textarea
        required value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={20000}
        className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]"
      />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit" disabled={saving || !text.trim()}
          className="focus-ring bg-[var(--color-charcoal)] text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-black disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save correction'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(''); }} className="focus-ring text-xs text-[var(--color-ink-soft)] hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
