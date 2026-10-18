'use client';
// components/admin/EraseRecordButton.tsx
// CEO only: permanently erases a patient's whole health record after a
// verified deletion request. Requires typing the patient's full name.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function EraseRecordButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function erase() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/patients/${patientId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: typed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'The record could not be erased');
      if (data.warning) alert(data.warning);
      router.push('/admin/patient-cases');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="focus-ring text-xs font-medium text-[var(--color-danger)] hover:underline">
        Erase this patient’s record…
      </button>
    );
  }

  return (
    <div className="border border-[var(--color-danger)] rounded-lg bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--color-danger)]">Permanently erase the whole record</p>
      <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
        Only do this for a verified deletion request from the patient (from the email on their record, or confirmed by
        their practitioner), after checking no law requires you to keep it. Every case, entry and file for this patient
        is deleted and cannot be recovered. The access log keeps a line saying the erasure happened, with no contents.
      </p>
      <label htmlFor="erase-confirm" className="block text-xs font-medium">Type <strong>{patientName}</strong> to confirm</label>
      <input
        id="erase-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
        className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button" disabled={busy || typed.trim() !== patientName.trim()} onClick={erase}
          className="focus-ring text-xs font-semibold bg-[var(--color-danger)] text-white rounded px-3 py-1.5 disabled:opacity-50"
        >
          {busy ? 'Erasing…' : 'Erase permanently'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setTyped(''); }} className="focus-ring text-xs text-[var(--color-ink-soft)] hover:underline">Cancel</button>
      </div>
    </div>
  );
}
