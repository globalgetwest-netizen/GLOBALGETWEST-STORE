'use client';
// components/admin/CategoryManager.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Category { id: string; name: string; slug: string; is_active: boolean; sort_order: number; }

export function CategoryManager({ initial }: { initial: Category[] }) {
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, sort_order: categories.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create category');
      setCategories([...categories, data]);
      setName('');
      setSlug('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, is_active: boolean) {
    setCategories(categories.map((c) => (c.id === id ? { ...c, is_active } : c)));
    await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    });
    router.refresh();
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={addCategory} className="flex gap-2 mb-6">
        <input
          type="text" placeholder="Name" required value={name}
          onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')); }}
          className="focus-ring flex-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        />
        <input
          type="text" placeholder="slug" required value={slug} onChange={(e) => setSlug(e.target.value)}
          className="focus-ring w-40 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit" disabled={saving}
          className="focus-ring bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="text-sm text-[var(--color-danger)] mb-4">{error}</p>}

      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white/60">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 border-[var(--color-border)] text-sm">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-[var(--color-ink-soft)]">/{c.slug}</p>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={c.is_active} onChange={(e) => toggleActive(c.id, e.target.checked)} />
              Active
            </label>
          </div>
        ))}
        {categories.length === 0 && <p className="px-4 py-6 text-center text-[var(--color-ink-soft)] text-sm">No categories yet.</p>}
      </div>
    </div>
  );
}
