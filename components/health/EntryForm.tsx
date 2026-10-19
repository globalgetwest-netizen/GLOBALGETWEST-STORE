'use client';
// components/health/EntryForm.tsx
// Practitioner adds an entry to the case timeline.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ENTRY_KIND_LABELS, PRACTITIONER_ENTRY_KINDS } from '@/lib/health/labels';
import { FileInput } from '@/components/health/FileInput';

const input = 'field';

const PLACEHOLDERS: Record<string, string> = {
  intake: 'Presenting complaint, history, medicines, allergies, observations.',
  assessment: 'Findings and your assessment.',
  plan: 'Treatment plan: products, dosage, duration, advice, when to follow up, when to seek hospital care.',
  product_dispensed: 'What was dispensed, quantity and instructions.',
  lab_result: 'Test, date, result and reference range. Attach the report if you have it.',
  check_in: 'What the patient reported (phone / WhatsApp / visit).',
  note: 'Note.',
};

export interface OrderOption { id: string; label: string }

export function EntryForm({ caseId, orders }: { caseId: string; orders: OrderOption[] }) {
  const [kind, setKind] = useState<string>('assessment');
  const [body, setBody] = useState('');
  const [visible, setVisible] = useState(true);
  const [orderId, setOrderId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData();
    form.set('kind', kind);
    form.set('body', body);
    form.set('visibleToPatient', visible ? 'yes' : 'no');
    if (kind === 'product_dispensed' && orderId) form.set('orderId', orderId);
    files.forEach((f) => form.append('files', f));
    try {
      const res = await fetch(`/api/practitioner/cases/${caseId}/entries`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'The entry could not be saved');
      setBody('');
      setFiles([]);
      setOrderId('');
      setVisible(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-[var(--color-border)] rounded-lg bg-white p-5 space-y-4">
      <h3 className="font-display text-xl">Add an entry</h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ef-kind" className="field-label">Kind</label>
          <select id="ef-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={input}>
            {PRACTITIONER_ENTRY_KINDS.map((k) => <option key={k} value={k}>{ENTRY_KIND_LABELS[k]}</option>)}
          </select>
        </div>
        {kind === 'product_dispensed' && (
          <div>
            <label htmlFor="ef-order" className="field-label">Linked order <span className="font-normal text-[var(--color-ink-muted)]">(optional)</span></label>
            <select id="ef-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} className={input}>
              <option value="">{orders.length ? 'Not linked to an order' : 'No orders found for this patient'}</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="ef-body" className="field-label">{ENTRY_KIND_LABELS[kind as keyof typeof ENTRY_KIND_LABELS]}</label>
        <textarea
          id="ef-body" required rows={5} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder={PLACEHOLDERS[kind]} className={input}
        />
      </div>

      <FileInput files={files} onChange={setFiles} label="Attachments (optional)" />

      <label className="flex items-start gap-3 text-sm cursor-pointer">
        <input type="checkbox" checked={!visible} onChange={(e) => setVisible(!e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-forest)]" />
        <span>
          Private working note — don’t show to the patient
          <span className="block text-xs text-[var(--color-ink-muted)]">Use sparingly. Patients have a right to their record; anything clinical they need to know should be visible.</span>
        </span>
      </label>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit" disabled={saving || !body.trim()}
          className="btn btn-primary"
        >
          {saving ? 'Saving…' : 'Sign and add entry'}
        </button>
        <span className="text-xs text-[var(--color-ink-muted)]">Saved under your name and licence. Can’t be edited afterwards.</span>
      </div>
    </form>
  );
}
