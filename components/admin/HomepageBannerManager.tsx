'use client';
// components/admin/HomepageBannerManager.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabase/client';

interface Banner { id: string; image_url: string; caption: string | null; link_url: string | null; }

export function HomepageBannerManager({ initial }: { initial: Banner[] }) {
  const [banners, setBanners] = useState(initial);
  const [caption, setCaption] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
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
      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);

      const res = await fetch('/api/admin/homepage-banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: pub.publicUrl,
          caption: caption || null,
          link_url: linkUrl || null,
          sort_order: banners.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save banner');

      setBanners([...banners, data]);
      setCaption('');
      setLinkUrl('');
      e.target.value = '';
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this banner image?')) return;
    setBanners(banners.filter((b) => b.id !== id));
    await fetch(`/api/admin/homepage-banners/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-[var(--color-ink-soft)]">
        Upload as many images as you like — each appears in its own full-width
        block on the homepage, shown at its full, uncropped size.
      </p>

      <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-3">
        <h3 className="font-semibold text-sm">Add a new banner</h3>
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
        <div>
          <label className="block text-sm font-medium mb-1">Image</label>
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
          {uploading && <p className="text-xs text-[var(--color-ink-soft)] mt-1">Uploading…</p>}
        </div>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Current banners ({banners.length})</h3>
        {banners.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">No banners yet — add one above.</p>
        )}
        {banners.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.image_url} alt="" className="w-20 h-20 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{b.caption || <span className="text-[var(--color-ink-soft)]">No caption</span>}</p>
              {b.link_url && <p className="text-xs text-[var(--color-ink-soft)] truncate">{b.link_url}</p>}
            </div>
            <button
              onClick={() => handleDelete(b.id)}
              className="focus-ring text-[var(--color-danger)] text-sm font-medium hover:underline shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
