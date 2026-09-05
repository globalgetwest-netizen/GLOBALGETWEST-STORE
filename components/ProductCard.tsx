'use client';
// components/ProductCard.tsx
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatUsd } from '@/lib/format';
import type { ProductCardData } from '@/lib/catalog';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i;
        const half = !filled && rating > i - 1;
        return (
          <svg key={i} viewBox="0 0 20 20" width="12" height="12" className="shrink-0">
            <defs>
              {half && (
                <linearGradient id={`half-${i}`}>
                  <stop offset="50%" stopColor="var(--color-ochre)" />
                  <stop offset="50%" stopColor="var(--color-border)" />
                </linearGradient>
              )}
            </defs>
            <path
              d="M10 1.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L10 14.7l-5.2 2.8 1-5.8L1.5 7.6l5.9-.8L10 1.5z"
              fill={filled ? 'var(--color-ochre)' : half ? `url(#half-${i})` : 'var(--color-border)'}
            />
          </svg>
        );
      })}
    </div>
  );
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'added' | 'error'>('idle');
  const router = useRouter();

  async function handleAddToCart(e: React.MouseEvent) {
    // Stop the click from also triggering the card's outer Link navigation.
    e.preventDefault();
    e.stopPropagation();

    if (!product.default_variant_id) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: product.default_variant_id, quantity: 1 }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          router.push(`/account/sign-in?next=/products/${product.slug}`);
          return;
        }
        throw new Error(data.error ?? 'Failed to add to cart');
      }
      setStatus('added');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group focus-ring block rounded-lg border border-[var(--color-border)] bg-white overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="relative aspect-square bg-[var(--color-parchment-warm)] overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[var(--color-ink-soft)] text-sm">
            No image
          </div>
        )}
        {product.origin_country && (
          <span className="absolute top-2 left-2 rounded-full bg-[var(--color-forest)] text-[var(--color-parchment)] text-[11px] font-medium px-2.5 py-1 tracking-wide">
            Sourced · {product.origin_country}
          </span>
        )}
      </div>

      <div className="p-3.5">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-ochre)] font-semibold mb-1">
          GLOBALGETWEST
        </p>
        <h3 className="font-display text-[15px] leading-snug text-[var(--color-ink)] line-clamp-2">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="mt-1 text-[13px] text-[var(--color-ink-soft)] line-clamp-2">
            {product.short_description}
          </p>
        )}

        {product.review_count > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <StarRating rating={product.avg_rating} />
            <span className="text-[11px] text-[var(--color-ink-soft)]">({product.review_count})</span>
          </div>
        )}

        <div className="mt-2 mb-3">
          <span className="font-semibold text-[17px] text-[var(--color-forest)]">
            from {formatUsd(product.price_from_usd_cents)}
          </span>
        </div>

        {product.default_variant_id && (
          <button
            onClick={handleAddToCart}
            disabled={status === 'loading'}
            className="focus-ring w-full text-xs font-semibold rounded-md py-2 border border-[var(--color-ink)] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-charcoal)] hover:text-white hover:border-[var(--color-charcoal)] disabled:opacity-60"
          >
            {status === 'loading' ? 'Adding…' : status === 'added' ? 'Added ✓' : status === 'error' ? 'Try again' : 'Add to Cart'}
          </button>
        )}
      </div>
    </Link>
  );
}
