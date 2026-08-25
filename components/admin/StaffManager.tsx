'use client';
// components/admin/StaffManager.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface StaffMember {
  id: string; full_name: string | null; phone: string | null;
  role: string; department: string | null; is_active: boolean; created_at: string;
}

const DEPARTMENTS = ['fulfilment', 'inventory', 'support', 'general'];

export function StaffManager({ initial }: { initial: StaffMember[] }) {
  const [staff, setStaff] = useState(initial);
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function promote(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, department }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to promote user');
      setStaff([data, ...staff]);
      setEmail('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, is_active: boolean) {
    setStaff(staff.map((s) => (s.id === id ? { ...s, is_active } : s)));
    await fetch(`/api/admin/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    });
    router.refresh();
  }

  async function changeDepartment(id: string, dept: string) {
    setStaff(staff.map((s) => (s.id === id ? { ...s, department: dept } : s)));
    await fetch(`/api/admin/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department: dept }),
    });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={promote} className="flex gap-2 mb-2 max-w-xl">
        <input
          type="email" placeholder="Existing customer's email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-ring flex-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        />
        <select
          value={department} onChange={(e) => setDepartment(e.target.value)}
          className="focus-ring rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm capitalize"
        >
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button
          type="submit" disabled={saving}
          className="focus-ring bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-60 whitespace-nowrap"
        >
          Promote to Staff
        </button>
      </form>
      {error && <p className="text-sm text-[var(--color-danger)] mb-4">{error}</p>}

      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white/60 mt-6">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-parchment-warm)] text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Department</th>
              <th className="px-4 py-2.5 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5 font-medium">{s.full_name ?? '—'}</td>
                <td className="px-4 py-2.5 capitalize">{s.role}</td>
                <td className="px-4 py-2.5">
                  {s.role === 'staff' ? (
                    <select
                      value={s.department ?? 'general'}
                      onChange={(e) => changeDepartment(s.id, e.target.value)}
                      className="focus-ring rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-xs capitalize"
                    >
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={s.is_active} onChange={(e) => toggleActive(s.id, e.target.checked)} />
                  </label>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-ink-soft)]">No staff accounts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
