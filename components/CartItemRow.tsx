'use client';
// components/CartItemRow.tsx
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatUsd } from '@/lib/format';
import type { CartLine } from '@/lib/cartTypes';

export function CartItemRow({ item }: { item: CartLine }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const variant = item.product_variants;
  const product = variant.products;
  const image = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const href = product.slug ? `/products/${product.slug}` : '/products';

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
    <div className={`flex gap-4 py-5 border-b border-[var(--color-border)] last:border-b-0 transition-opacity ${pending ? 'opacity-60' : ''}`}>
      <Link href={href} className="focus-ring w-24 h-24 shrink-0 rounded-md bg-[var(--color-parchment-warm)] overflow-hidden">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={product.name} className="h-full w-full object-cover" />
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex justify-between gap-4">
          <div className="min-w-0">
            <Link href={href} className="focus-ring font-display text-lg leading-snug hover:text-[var(--color-forest)]">
              {product.name}
            </Link>
            <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">{variant.name}</p>
          </div>
          <p className="font-semibold text-sm whitespace-nowrap">{formatUsd(variant.price_usd_cents * quantity)}</p>
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-md border border-[var(--color-border)]" role="group" aria-label={`Quantity of ${product.name}`}>
            <button
              type="button"
              onClick={() => updateQuantity(quantity - 1)}
              disabled={pending}
              aria-label={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
              className="focus-ring w-8 h-8 text-lg leading-none text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(quantity + 1)}
              disabled={pending}
              aria-label="Increase quantity"
              className="focus-ring w-8 h-8 text-lg leading-none text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => updateQuantity(0)}
            disabled={pending}
            className="focus-ring text-xs text-[var(--color-ink-soft)] underline-offset-2 hover:underline hover:text-[var(--color-danger)]"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
