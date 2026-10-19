'use client';
// components/admin/CaseAssigner.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CaseAssigner({ caseId, current, practitioners }: {
  caseId: string;
  current: string | null;
  practitioners: { id: string; label: string }[];
}) {
  const [value, setValue] = useState(current ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function change(next: string) {
    const previous = value;
    setValue(next);
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/patient-cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practitionerId: next || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not assign');
      router.refresh();
    } catch (err) {
      setValue(previous);
      setError(err instanceof Error ? err.message : 'Could not assign');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <select
        aria-label="Assigned practitioner" value={value} disabled={busy} onChange={(e) => change(e.target.value)}
        className="field max-w-[220px] disabled:opacity-60"
      >
        <option value="">Unassigned</option>
        {practitioners.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
    </div>
  );
}
