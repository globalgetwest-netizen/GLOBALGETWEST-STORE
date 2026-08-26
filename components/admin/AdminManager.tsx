'use client';
// components/admin/AdminManager.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminMember {
  id: string; full_name: string | null; email: string | null;
  role: string; is_active: boolean; created_at: string;
}

export function AdminManager({ initial }: { initial: AdminMember[] }) {
  const [admins, setAdmins] = useState(initial);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function promote(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to promote user');
      setAdmins([data, ...admins]);
      setEmail('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, is_active: boolean) {
    setAdmins(admins.map((a) => (a.id === id ? { ...a, is_active } : a)));
    await fetch(`/api/admin/admins/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
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
        <button
          type="submit" disabled={saving}
          className="focus-ring bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-60 whitespace-nowrap"
        >
          Promote to Admin
        </button>
      </form>
      {error && <p className="text-sm text-[var(--color-danger)] mb-4">{error}</p>}

      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white/60 mt-6">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-parchment-warm)] text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5 font-medium">{a.full_name ?? '—'}</td>
                <td className="px-4 py-2.5 capitalize">{a.role}</td>
                <td className="px-4 py-2.5">
                  {a.role === 'ceo' ? (
                    <span className="text-xs text-[var(--color-ink-soft)]">Cannot deactivate CEO</span>
                  ) : (
                    <input type="checkbox" checked={a.is_active} onChange={(e) => toggleActive(a.id, e.target.checked)} />
                  )}
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--color-ink-soft)]">No admin accounts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
