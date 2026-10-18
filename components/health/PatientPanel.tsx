'use client';
// components/health/PatientPanel.tsx
// Practitioner case page sidebar extras: issue a new record code for a
// patient who hasn't linked their account, and open another case.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClaimCodeNotice } from '@/components/health/ClaimCodeNotice';

const input = 'focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm';

export function ClaimCodeReset({ patientId }: { patientId: string }) {
  const [issued, setIssued] = useState<{ claimCode: string; claimCodeExpiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function issue() {
    if (!confirm('Issue a new record code? Any earlier code stops working.')) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/practitioner/patients/${patientId}/claim-code`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'A new code could not be issued');
      setIssued(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (issued) return <ClaimCodeNotice code={issued.claimCode} expiresAt={issued.claimCodeExpiresAt} />;
  return (
    <div>
      <p className="text-xs text-[var(--color-ink-soft)] mb-2">Not yet linked to the patient’s own account.</p>
      <button type="button" onClick={issue} disabled={busy} className="focus-ring text-xs font-medium border border-[var(--color-border)] rounded px-3 py-1.5 hover:bg-[var(--color-parchment-warm)] disabled:opacity-60">
        {busy ? 'Issuing…' : 'Issue new record code'}
      </button>
      {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
    </div>
  );
}

export function NewCaseForm({ patientId, categories }: { patientId: string; categories: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    form.set('patientId', patientId);
    try {
      const res = await fetch('/api/practitioner/cases', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.caseId) throw new Error(data.error ?? 'The case could not be opened');
      router.push(`/practitioner/cases/${data.caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="focus-ring text-xs font-medium border border-[var(--color-border)] rounded px-3 py-1.5 hover:bg-[var(--color-parchment-warm)]">
        Open another case for this patient
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="nc-condition" className="block text-xs font-medium mb-1">Condition</label>
        <input id="nc-condition" name="condition" required maxLength={200} className={input} />
      </div>
      {categories.length > 0 && (
        <div>
          <label htmlFor="nc-category" className="block text-xs font-medium mb-1">Category</label>
          <select id="nc-category" name="categoryId" className={input} defaultValue="">
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="nc-intake" className="block text-xs font-medium mb-1">Intake notes</label>
        <textarea id="nc-intake" name="intake" required rows={4} maxLength={20000} className={input} />
      </div>
      <input type="hidden" name="status" value="intake" />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="focus-ring bg-[var(--color-charcoal)] text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-black disabled:opacity-60">
          {busy ? 'Opening…' : 'Open case'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="focus-ring text-xs text-[var(--color-ink-soft)] hover:underline">Cancel</button>
      </div>
    </form>
  );
}
