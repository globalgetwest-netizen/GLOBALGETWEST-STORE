'use client';
// components/CartItemRow.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatUsd } from '@/lib/format';

export function CartItemRow({ item }: { item: any }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const product = item.product_variants.products;
  const image = (product.product_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)[0];

  async function updateQuantity(next: number) {
    setPending(true);
    setQuantity(next);
    await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItemId: item.id, quantity: next }),
    });
    router.refresh();
    setPending(false);
  }

  return (
    <div className="flex gap-4 border border-[var(--color-border)] rounded-lg p-4 bg-white/60">
      <div className="w-20 h-20 shrink-0 rounded-md bg-[var(--color-parchment-warm)] overflow-hidden">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={product.name} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="flex-1">
        <p className="font-medium text-sm">{product.name}</p>
        <p className="text-xs text-[var(--color-ink-soft)]">{item.product_variants.name}</p>
        <p className="text-sm font-semibold text-[var(--color-forest)] mt-1">
          {formatUsd(item.product_variants.price_usd_cents)}
        </p>

        <div className="flex items-center gap-3 mt-2">
          <input
            type="number"
            min={1}
            value={quantity}
            disabled={pending}
            onChange={(e) => updateQuantity(Math.max(1, Number(e.target.value)))}
            className="focus-ring w-16 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          />
          <button
            onClick={() => updateQuantity(0)}
            disabled={pending}
            className="focus-ring text-xs text-[var(--color-danger)] hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
