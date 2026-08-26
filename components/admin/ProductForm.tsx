'use client';
// components/admin/ProductForm.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabase/client';

interface VariantDraft {
  id?: string;
  sku: string;
  name: string;
  price_usd_cents: number;
  compare_at_usd_cents: number | null;
  is_active: boolean;
}

interface ImageDraft {
  id?: string;
  url: string;
  alt_text: string;
}

interface Category { id: string; name: string; }

interface ProductDraft {
  id?: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  category_id: string;
  origin_country: string;
  ingredients: string;
  usage_instructions: string;
  warnings: string;
  is_active: boolean;
  is_featured: boolean;
  variants: VariantDraft[];
  images: ImageDraft[];
}

export function ProductForm({
  categories, initial,
}: {
  categories: Category[];
  initial?: ProductDraft;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [form, setForm] = useState<ProductDraft>(initial ?? {
    slug: '', name: '', short_description: '', description: '',
    category_id: categories[0]?.id ?? '', origin_country: '',
    ingredients: '', usage_instructions: '', warnings: '',
    is_active: true, is_featured: false,
    variants: [{ sku: '', name: '', price_usd_cents: 0, compare_at_usd_cents: null, is_active: true }],
    images: [{ url: '', alt_text: '' }],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateField<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // Auto-fill slug from name (matching the existing category-form pattern),
  // but only while the user hasn't manually touched the slug field —
  // editing an existing product's slug directly still works normally.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEdit);

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  function updateImage(index: number, patch: Partial<ImageDraft>) {
    setForm((f) => ({
      ...f,
      images: f.images.map((img, i) => (i === index ? { ...img, ...patch } : img)),
    }));
  }

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');

  async function handleFileUpload(index: number, file: File) {
    setUploadingIndex(index);
    setUploadError('');
    try {
      const supabase = supabaseBrowserClient();
      const ext = file.name.split('.').pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);

      updateImage(index, { url: publicUrlData.publicUrl });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingIndex(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = isEdit ? `/api/admin/products/${initial!.id}` : '/api/admin/products';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save product');

      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <section className="space-y-4">
        <h2 className="font-display text-lg">Basics</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField
            label="Name"
            value={form.name}
            onChange={(v) => {
              updateField('name', v);
              if (!slugManuallyEdited) updateField('slug', slugify(v));
            }}
          />
          <TextField
            label="Slug (URL)"
            value={form.slug}
            onChange={(v) => { setSlugManuallyEdited(true); updateField('slug', slugify(v)); }}
          />
          <div>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => updateField('category_id', e.target.value)}
              className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <TextField label="Origin country" value={form.origin_country} onChange={(v) => updateField('origin_country', v)} required={false} />
        </div>
        <TextField label="Short description" value={form.short_description} onChange={(v) => updateField('short_description', v)} required={false} />
        <TextArea label="Full description" value={form.description} onChange={(v) => updateField('description', v)} required={false} />

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => updateField('is_active', e.target.checked)} />
            Active (visible in store)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => updateField('is_featured', e.target.checked)} />
            Featured on homepage
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg">Herbal Disclosure</h2>
        <TextArea label="Ingredients" value={form.ingredients} onChange={(v) => updateField('ingredients', v)} required={false} />
        <TextArea label="Usage instructions" value={form.usage_instructions} onChange={(v) => updateField('usage_instructions', v)} required={false} />
        <TextArea label="Warnings" value={form.warnings} onChange={(v) => updateField('warnings', v)} required={false} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Variants (size / form)</h2>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, { sku: '', name: '', price_usd_cents: 0, compare_at_usd_cents: null, is_active: true }] }))}
            className="focus-ring text-sm text-[var(--color-forest)] hover:underline"
          >
            + Add variant
          </button>
        </div>
        {form.variants.map((v, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-3 border border-[var(--color-border)] rounded-md p-3">
            <TextField label="SKU" value={v.sku} onChange={(val) => updateVariant(i, { sku: val })} compact />
            <TextField label="Name" value={v.name} onChange={(val) => updateVariant(i, { name: val })} compact />
            <NumberField
              label="Price (USD)"
              value={v.price_usd_cents / 100}
              onChange={(val) => updateVariant(i, { price_usd_cents: Math.round(val * 100) })}
              compact
            />
            <NumberField
              label="Compare-at (USD)"
              value={v.compare_at_usd_cents ? v.compare_at_usd_cents / 100 : 0}
              onChange={(val) => updateVariant(i, { compare_at_usd_cents: val > 0 ? Math.round(val * 100) : null })}
              compact
            />
            <label className="flex items-center gap-2 text-xs self-end pb-2">
              <input type="checkbox" checked={v.is_active} onChange={(e) => updateVariant(i, { is_active: e.target.checked })} />
              Active
            </label>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Images</h2>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, images: [...f.images, { url: '', alt_text: '' }] }))}
            className="focus-ring text-sm text-[var(--color-forest)] hover:underline"
          >
            + Add image
          </button>
        </div>
        <p className="text-xs text-[var(--color-ink-soft)]">
          Upload photos directly — stored in Supabase Storage and served publicly.
        </p>
        {uploadError && <p className="text-sm text-[var(--color-danger)]">{uploadError}</p>}
        {form.images.map((img, i) => (
          <div key={i} className="flex gap-3 items-start border border-[var(--color-border)] rounded-md p-3">
            <div className="w-20 h-20 shrink-0 rounded-md bg-[var(--color-parchment-warm)] overflow-hidden">
              {img.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/*"
                disabled={uploadingIndex === i}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(i, file);
                }}
                className="focus-ring w-full text-xs"
              />
              {uploadingIndex === i && <p className="text-xs text-[var(--color-ink-soft)]">Uploading…</p>}
              <TextField label="Alt text" value={img.alt_text} onChange={(val) => updateImage(i, { alt_text: val })} compact required={false} />
            </div>
          </div>
        ))}
      </section>

      <button
        type="submit"
        disabled={saving}
        className="focus-ring bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-6 py-2.5 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-60"
      >
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
      </button>
    </form>
  );
}

function TextField({
  label, value, onChange, required = true, compact = false,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; compact?: boolean }) {
  return (
    <div>
      <label className={`block font-medium mb-1.5 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</label>
      <input
        type="text" required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className={`focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'}`}
      />
    </div>
  );
}

function NumberField({
  label, value, onChange, compact = false,
}: { label: string; value: number; onChange: (v: number) => void; compact?: boolean }) {
  return (
    <div>
      <label className={`block font-medium mb-1.5 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</label>
      <input
        type="number" step="0.01" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className={`focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'}`}
      />
    </div>
  );
}

function TextArea({
  label, value, onChange, required = true,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <textarea
        required={required} value={value} onChange={(e) => onChange(e.target.value)} rows={4}
        className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
      />
    </div>
  );
}
