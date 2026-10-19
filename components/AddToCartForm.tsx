'use client';
// components/AddToCartForm.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatUsd } from '@/lib/format';
import { LocalPrice } from '@/components/LocalPrice';

interface Variant {
  id: string;
  name: string;
  price_usd_cents: number;
  compare_at_usd_cents: number | null;
  is_active: boolean;
}

export function AddToCartForm({ variants }: { variants: Variant[] }) {
  const active = variants.filter((v) => v.is_active);
  const [variantId, setVariantId] = useState(active[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'added' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const selected = active.find((v) => v.id === variantId);

  async function handleAddToCart() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/account/sign-in?next=' + window.location.pathname);
          return;
        }
        throw new Error(data.error ?? 'Failed to add to cart');
      }
      setStatus('added');
      router.refresh();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (active.length === 0) {
    return <p className="text-[var(--color-danger)] text-sm">Currently unavailable.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="variant" className="field-label">Size / Form</label>
        <select
          id="variant"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className="field"
        >
          {active.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {formatUsd(v.price_usd_cents)}
            </option>
          ))}
        </select>
        {selected && <LocalPrice usdCents={selected.price_usd_cents} className="block mt-1.5 text-sm" />}
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label htmlFor="qty" className="field-label">Quantity</label>
          <input
            id="qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="field w-20"
          />
        </div>

        <button
          onClick={handleAddToCart}
          disabled={status === 'loading'}
          className="btn btn-primary flex-1"
        >
          {status === 'loading' ? 'Adding…' : status === 'added' ? 'Added ✓' : 'Add to Cart'}
        </button>
      </div>

      {selected?.compare_at_usd_cents && selected.compare_at_usd_cents > selected.price_usd_cents && (
        <p className="text-sm text-[var(--color-ink-soft)]">
          <span className="line-through">{formatUsd(selected.compare_at_usd_cents)}</span>{' '}
          <span className="text-[var(--color-danger)] font-medium">
            Save {formatUsd(selected.compare_at_usd_cents - selected.price_usd_cents)}
          </span>
        </p>
      )}

      {status === 'error' && <p className="text-sm text-[var(--color-danger)]">{errorMsg}</p>}
      {status === 'added' && (
        <a href="/cart" className="focus-ring block text-sm text-[var(--color-forest)] font-medium hover:underline">
          View cart →
        </a>
      )}
    </div>
  );
}
