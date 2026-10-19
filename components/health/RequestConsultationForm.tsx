'use client';
// components/health/RequestConsultationForm.tsx
// Opens a new case for a condition. It starts unassigned; an administrator
// assigns a licensed practitioner, who then contacts the patient.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileInput } from '@/components/health/FileInput';

const input = 'field';

export function RequestConsultationForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData();
    form.set('condition', condition);
    form.set('categoryId', categoryId);
    form.set('body', body);
    files.forEach((f) => form.append('files', f));
    try {
      const res = await fetch('/api/health/cases', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.caseId) throw new Error(data.error ?? 'Your request could not be sent');
      router.push(`/account/health/cases/${data.caseId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button" onClick={() => setOpen(true)}
        className="focus-ring border border-[var(--color-charcoal)] font-semibold text-sm px-4 py-2 rounded hover:bg-[var(--color-parchment-warm)]"
      >
        Request a consultation
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="border border-[var(--color-border)] rounded-lg bg-white p-5 space-y-4">
      <div>
        <h3 className="font-display text-xl">Request a consultation</h3>
        <p className="text-xs text-[var(--color-ink-soft)] mt-1">
          A licensed practitioner on our team will be assigned and will contact you. This is not an emergency service —
          if you feel very unwell, go to the nearest hospital.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="rc-condition" className="field-label">What would you like help with?</label>
          <input id="rc-condition" required maxLength={200} value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. High blood pressure" className={input} />
        </div>
        {categories.length > 0 && (
          <div>
            <label htmlFor="rc-category" className="field-label">Area <span className="font-normal text-[var(--color-ink-muted)]">(optional)</span></label>
            <select id="rc-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={input}>
              <option value="">Not sure</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="rc-body" className="field-label">Describe your symptoms, how long you’ve had them, and any medicines you take</label>
        <textarea id="rc-body" required rows={5} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} className={input} />
      </div>
      <FileInput files={files} onChange={setFiles} label="Photos or test results (optional)" />
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-3 items-center">
        <button
          type="submit" disabled={saving}
          className="btn btn-primary"
        >
          {saving ? 'Sending…' : 'Send request'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="focus-ring text-sm text-[var(--color-ink-soft)] hover:underline">Cancel</button>
      </div>
    </form>
  );
}
