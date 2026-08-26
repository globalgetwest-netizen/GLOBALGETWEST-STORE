// components/ProductCard.tsx
import Link from 'next/link';
import { formatUsd, type ProductCardData } from '@/lib/catalog';

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group focus-ring block rounded-lg border border-[var(--color-border)] bg-white/60 overflow-hidden transition-shadow hover:shadow-md"
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
        <h3 className="font-display text-[15px] leading-snug text-[var(--color-ink)] line-clamp-2">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="mt-1 text-[13px] text-[var(--color-ink-soft)] line-clamp-2">
            {product.short_description}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <span className="font-semibold text-[var(--color-forest)]">
            from {formatUsd(product.price_from_usd_cents)}
          </span>
          {product.review_count > 0 && (
            <span className="text-[12px] text-[var(--color-ink-soft)]">
              ★ {product.avg_rating.toFixed(1)} ({product.review_count})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
