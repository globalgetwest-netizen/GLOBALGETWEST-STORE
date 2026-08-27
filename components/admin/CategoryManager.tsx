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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const router = useRouter();

  function slugify(text: string): string {
    return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }

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

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditSlug(c.slug);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, slug: editSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save changes');
      setCategories(categories.map((c) => (c.id === id ? { ...c, name: editName, slug: editSlug } : c)));
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — the slug may already be in use');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string, catName: string) {
    if (!confirm(`Delete "${catName}"? Any products using it will just lose their category assignment — nothing else breaks. This can't be undone.`)) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCategories(categories.filter((c) => c.id !== id));
    } else {
      setError('Failed to delete category');
    }
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">
        The storefront's top navigation shows your active categories automatically, in the order below —
        rename, reorder, or deactivate here and it updates there too.
      </p>

      <form onSubmit={addCategory} className="flex gap-2 mb-2">
        <input
          type="text" placeholder="Name" required value={name}
          onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }}
          className="focus-ring flex-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        />
        <input
          type="text" placeholder="slug" required value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
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
          <div key={c.id} className="px-4 py-3 border-b last:border-b-0 border-[var(--color-border)] text-sm">
            {editingId === c.id ? (
              <div className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setEditSlug(slugify(e.target.value)); }}
                  className="focus-ring flex-1 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-sm"
                />
                <input
                  value={editSlug}
                  onChange={(e) => setEditSlug(slugify(e.target.value))}
                  className="focus-ring w-36 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-sm"
                />
                <button onClick={() => saveEdit(c.id)} disabled={saving} className="focus-ring text-[var(--color-forest)] font-medium hover:underline">
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="focus-ring text-[var(--color-ink-soft)] hover:underline">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">/{c.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={c.is_active} onChange={(e) => toggleActive(c.id, e.target.checked)} />
                    Active
                  </label>
                  <button onClick={() => startEdit(c)} className="focus-ring text-[var(--color-forest)] hover:underline">
                    Rename
                  </button>
                  <button onClick={() => deleteCategory(c.id, c.name)} className="focus-ring text-[var(--color-danger)] hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && <p className="px-4 py-6 text-center text-[var(--color-ink-soft)] text-sm">No categories yet.</p>}
      </div>
    </div>
  );
}
