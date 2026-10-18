'use client';
// components/admin/OrderDetailPanel.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUSES = ['pending_payment', 'paid', 'processing', 'fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded'];

interface StaffOption { id: string; full_name: string | null; }

export function OrderDetailPanel({
  orderId, currentStatus, currentAssigned, staffOptions,
}: {
  orderId: string;
  currentStatus: string;
  currentAssigned: string | null;
  staffOptions: StaffOption[];
}) {
  const [status, setStatus] = useState(currentStatus);
  const [assignedTo, setAssignedTo] = useState(currentAssigned ?? '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const router = useRouter();

  async function saveStatus(newStatus: string) {
    const previous = status;
    setStatus(newStatus);
    setSaving(true);
    setStatusMessage(null);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(previous);
      setStatusMessage({ tone: 'warn', text: data.error ?? 'Could not update the status.' });
    } else if (data.warning) {
      setStatusMessage({ tone: 'warn', text: data.warning });
    } else {
      setStatusMessage({ tone: 'ok', text: 'Status saved. Stock updated automatically.' });
    }
    router.refresh();
    setSaving(false);
  }

  async function saveAssignment(staffId: string) {
    setAssignedTo(staffId);
    setSaving(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_staff_id: staffId || null }),
    });
    router.refresh();
    setSaving(false);
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setNote('');
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5">Status</label>
        <select
          value={status} disabled={saving} onChange={(e) => saveStatus(e.target.value)}
          className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm capitalize"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        {statusMessage && (
          <p className={`mt-1.5 text-xs ${statusMessage.tone === 'warn' ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink-soft)]'}`}>
            {statusMessage.text}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Assigned to (fulfilment)</label>
        <select
          value={assignedTo} disabled={saving} onChange={(e) => saveAssignment(e.target.value)}
          className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        >
          <option value="">Unassigned</option>
          {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>)}
        </select>
      </div>

      <form onSubmit={addNote} className="space-y-2">
        <label className="block text-sm font-medium">Add a note</label>
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit" disabled={saving || !note.trim()}
          className="focus-ring text-sm bg-[var(--color-forest)] text-[var(--color-parchment)] px-4 py-1.5 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-50"
        >
          Add note
        </button>
      </form>
    </div>
  );
}
