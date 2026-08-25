'use client';
// components/staff/InventoryManager.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Row { id: string; sku: string; name: string; productName: string; stock: number; }

const REASONS = ['restock', 'correction', 'damage', 'return'];

export function InventoryManager({ rows }: { rows: Row[] }) {
  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [quantityChange, setQuantityChange] = useState(0);
  const [reason, setReason] = useState('restock');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const router = useRouter();

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(filter.toLowerCase()) ||
    r.productName.toLowerCase().includes(filter.toLowerCase()) ||
    r.sku.toLowerCase().includes(filter.toLowerCase()),
  );

  async function submitAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjusting || quantityChange === 0) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/staff/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: adjusting.id, quantityChange, reason, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to adjust stock');
      setAdjusting(null);
      setQuantityChange(0);
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <input
        type="text" placeholder="Search by product, variant, or SKU..." value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="focus-ring w-full max-w-sm rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm mb-4"
      />

      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white/60">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-parchment-warm)] text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">Variant</th>
              <th className="px-4 py-2.5 font-medium">SKU</th>
              <th className="px-4 py-2.5 font-medium">Stock</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5 font-medium">{r.productName}</td>
                <td className="px-4 py-2.5">{r.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-ink-soft)]">{r.sku}</td>
                <td className="px-4 py-2.5">
                  <span className={r.stock < 10 ? 'text-[var(--color-danger)] font-semibold' : ''}>{r.stock}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setAdjusting(r)} className="focus-ring text-[var(--color-forest)] hover:underline">
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-ink-soft)]">No variants match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adjusting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={submitAdjustment} className="bg-white rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="font-display text-lg">Adjust stock — {adjusting.name}</h3>
            <p className="text-sm text-[var(--color-ink-soft)]">Current: {adjusting.stock}</p>

            <div>
              <label className="block text-sm font-medium mb-1.5">Quantity change (+/-)</label>
              <input
                type="number" value={quantityChange} onChange={(e) => setQuantityChange(Number(e.target.value))}
                className="focus-ring w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Reason</label>
              <select
                value={reason} onChange={(e) => setReason(e.target.value)}
                className="focus-ring w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm capitalize"
              >
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Note (optional)</label>
              <textarea
                value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                className="focus-ring w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

            <div className="flex gap-2">
              <button
                type="submit" disabled={saving || quantityChange === 0}
                className="focus-ring flex-1 bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Adjustment'}
              </button>
              <button
                type="button" onClick={() => { setAdjusting(null); setQuantityChange(0); setError(''); }}
                className="focus-ring px-4 py-2 rounded-md border border-[var(--color-border)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
