'use client';
// components/admin/HomepageBannerManager.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabase/client';

interface Banner { image_url: string | null; caption: string | null; link_url: string | null; }

export function HomepageBannerManager({ initial }: { initial: Banner }) {
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? '');
  const [caption, setCaption] = useState(initial.caption ?? '');
  const [linkUrl, setLinkUrl] = useState(initial.link_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const supabase = supabaseBrowserClient();
      const path = `homepage-banner/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/admin/homepage-banner', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl || null, caption: caption || null, link_url: linkUrl || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm('Remove the homepage banner? This just hides it — you can upload a new one anytime.')) return;
    setImageUrl('');
    setSaving(true);
    try {
      await fetch('/api/admin/homepage-banner', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: null }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-[var(--color-ink-soft)]">
        Upload an image you have the rights to use — it will appear in a
        dedicated section on the homepage, with the caption and link below.
      </p>

      {imageUrl && (
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Homepage banner preview" className="w-full max-h-64 object-cover" />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Banner image</label>
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        {uploading && <p className="text-xs text-[var(--color-ink-soft)] mt-1">Uploading…</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Caption (optional)</label>
        <input
          type="text" value={caption} onChange={(e) => setCaption(e.target.value)}
          className="focus-ring w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder="A short line of text under the image"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Link URL (optional)</label>
        <input
          type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
          className="focus-ring w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder="/products or a full URL"
        />
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {saved && <p className="text-sm text-[var(--color-forest)]">Saved.</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave} disabled={saving || uploading}
          className="focus-ring bg-[var(--color-charcoal)] text-white font-semibold px-5 py-2.5 rounded hover:bg-black disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Banner'}
        </button>
        {imageUrl && (
          <button
            onClick={handleRemove} disabled={saving}
            className="focus-ring text-[var(--color-danger)] font-medium hover:underline"
          >
            Remove banner
          </button>
        )}
      </div>
    </div>
  );
}
