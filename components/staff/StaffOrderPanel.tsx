'use client';
// components/staff/StaffOrderPanel.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Staff can only move orders forward through fulfilment states — not touch
// payment-related states (paid/refunded) or reopen a cancelled order.
const STAFF_STATUSES = ['processing', 'fulfilled', 'shipped', 'delivered'];

export function StaffOrderPanel({
  orderId, currentStatus, isAssignedToMe, staffId,
}: {
  orderId: string; currentStatus: string; isAssignedToMe: boolean; staffId: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function claimOrder() {
    setSaving(true);
    await fetch(`/api/staff/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_staff_id: staffId }),
    });
    router.refresh();
    setSaving(false);
  }

  async function updateStatus(newStatus: string) {
    setStatus(newStatus);
    setSaving(true);
    await fetch(`/api/staff/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
    setSaving(false);
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await fetch(`/api/staff/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setNote('');
    router.refresh();
    setSaving(false);
  }

  if (!isAssignedToMe) {
    return (
      <button
        onClick={claimOrder}
        disabled={saving}
        className="focus-ring w-full bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-4 py-2.5 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-60"
      >
        Claim this order
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5">Update status</label>
        <select
          value={status} disabled={saving} onChange={(e) => updateStatus(e.target.value)}
          className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm capitalize"
        >
          {STAFF_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
