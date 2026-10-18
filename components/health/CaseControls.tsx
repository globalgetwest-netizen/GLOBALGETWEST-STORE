'use client';
// components/health/CaseControls.tsx
// Practitioner-side case actions: status, close with an outcome, reopen,
// and refine the condition. The database records each change on the
// timeline, so these are never silent.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CASE_OUTCOMES, OPEN_STATUSES, OUTCOME_LABELS, STATUS_LABELS, type CaseOutcome, type CaseStatus,
} from '@/lib/health/labels';

const input = 'focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm';

export function CaseControls({ caseId, status, outcome, condition }: {
  caseId: string;
  status: CaseStatus;
  outcome: CaseOutcome | null;
  condition: string;
}) {
  const [panel, setPanel] = useState<'none' | 'close' | 'condition'>('none');
  const [newOutcome, setNewOutcome] = useState('');
  const [note, setNote] = useState('');
  const [newCondition, setNewCondition] = useState(condition);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/practitioner/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'The case could not be updated');
      setPanel('none');
      setNote('');
      setNewOutcome('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-[var(--color-border)] rounded-lg bg-white p-5 space-y-4">
      <h3 className="font-display text-xl">Case</h3>

      {outcome ? (
        <div className="space-y-3">
          <p className="text-sm">Closed — <strong>{OUTCOME_LABELS[outcome]}</strong>.</p>
          <button
            type="button" disabled={busy}
            onClick={() => { if (confirm('Reopen this case? The reopening is recorded on the timeline.')) send({ action: 'reopen' }); }}
            className="focus-ring text-sm font-medium border border-[var(--color-border)] rounded px-3 py-1.5 hover:bg-[var(--color-parchment-warm)] disabled:opacity-60"
          >
            Reopen case
          </button>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="cc-status" className="block text-sm font-medium mb-1.5">Status</label>
            <select
              id="cc-status" value={status} disabled={busy}
              onChange={(e) => send({ action: 'status', status: e.target.value })}
              className={input}
            >
              {OPEN_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          {panel === 'close' ? (
            <form onSubmit={(e) => { e.preventDefault(); send({ action: 'close', outcome: newOutcome, note }); }} className="space-y-3 border-t border-[var(--color-border)] pt-4">
              <div>
                <label htmlFor="cc-outcome" className="block text-sm font-medium mb-1.5">Outcome</label>
                <select id="cc-outcome" required value={newOutcome} onChange={(e) => setNewOutcome(e.target.value)} className={input}>
                  <option value="">Choose what actually happened…</option>
                  {CASE_OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cc-note" className="block text-sm font-medium mb-1.5">Outcome note</label>
                <textarea
                  id="cc-note" required rows={4} maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} className={input}
                  placeholder="What happened, with evidence where you have it (e.g. follow-up readings, lab results). Visible to the patient."
                />
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">Record the real result, including no change, worsening or loss to follow-up.</p>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="focus-ring bg-[var(--color-charcoal)] text-white text-sm font-semibold px-4 py-2 rounded hover:bg-black disabled:opacity-60">
                  {busy ? 'Closing…' : 'Close case'}
                </button>
                <button type="button" onClick={() => setPanel('none')} className="focus-ring text-sm text-[var(--color-ink-soft)] hover:underline">Cancel</button>
              </div>
            </form>
          ) : panel === 'condition' ? (
            <form onSubmit={(e) => { e.preventDefault(); send({ action: 'condition', condition: newCondition }); }} className="space-y-3 border-t border-[var(--color-border)] pt-4">
              <label htmlFor="cc-condition" className="block text-sm font-medium">Condition</label>
              <input id="cc-condition" required maxLength={200} value={newCondition} onChange={(e) => setNewCondition(e.target.value)} className={input} />
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="focus-ring bg-[var(--color-charcoal)] text-white text-sm font-semibold px-4 py-2 rounded hover:bg-black disabled:opacity-60">Save</button>
                <button type="button" onClick={() => setPanel('none')} className="focus-ring text-sm text-[var(--color-ink-soft)] hover:underline">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPanel('close')} className="focus-ring text-sm font-medium border border-[var(--color-charcoal)] rounded px-3 py-1.5 hover:bg-[var(--color-parchment-warm)]">
                Close with outcome
              </button>
              <button type="button" onClick={() => setPanel('condition')} className="focus-ring text-sm font-medium border border-[var(--color-border)] rounded px-3 py-1.5 hover:bg-[var(--color-parchment-warm)]">
                Edit condition
              </button>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
