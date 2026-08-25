// app/products/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/catalog';
import { AddToCartForm } from '@/components/AddToCartForm';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const images = (product.product_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const publishedReviews = (product.reviews ?? []).filter((r: any) => r.is_published);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 grid md:grid-cols-2 gap-10">
      {/* Images */}
      <div>
        <div className="aspect-square rounded-lg bg-[var(--color-parchment-warm)] overflow-hidden border border-[var(--color-border)]">
          {images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0].url} alt={images[0].alt_text ?? product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[var(--color-ink-soft)]">No image</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {images.slice(1, 6).map((img: any) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt={img.alt_text ?? ''}
                className="aspect-square object-cover rounded-md border border-[var(--color-border)]"
              />
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div>
        {product.categories?.name && (
          <p className="text-xs uppercase tracking-wide text-[var(--color-ochre)] font-medium mb-2">
            {product.categories.name}
          </p>
        )}
        <h1 className="font-display text-3xl mb-2">{product.name}</h1>

        {product.review_count > 0 && (
          <p className="text-sm text-[var(--color-ink-soft)] mb-4">
            ★ {product.avg_rating.toFixed(1)} · {product.review_count} review{product.review_count === 1 ? '' : 's'}
          </p>
        )}

        {product.origin_country && (
          <p className="inline-block text-xs bg-[var(--color-forest)] text-[var(--color-parchment)] rounded-full px-3 py-1 mb-4">
            Sourced · {product.origin_country}
          </p>
        )}

        {product.short_description && (
          <p className="text-[var(--color-ink-soft)] mb-6">{product.short_description}</p>
        )}

        <div className="border-t border-[var(--color-border)] pt-6">
          <AddToCartForm variants={product.product_variants ?? []} />
        </div>

        <div className="mt-8 space-y-5 text-sm">
          {product.description && (
            <section>
              <h2 className="font-semibold mb-1.5">Description</h2>
              <p className="text-[var(--color-ink-soft)] whitespace-pre-line">{product.description}</p>
            </section>
          )}
          {product.ingredients && (
            <section>
              <h2 className="font-semibold mb-1.5">Ingredients</h2>
              <p className="text-[var(--color-ink-soft)] whitespace-pre-line">{product.ingredients}</p>
            </section>
          )}
          {product.usage_instructions && (
            <section>
              <h2 className="font-semibold mb-1.5">How to Use</h2>
              <p className="text-[var(--color-ink-soft)] whitespace-pre-line">{product.usage_instructions}</p>
            </section>
          )}
          {product.warnings && (
            <section className="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3.5">
              <h2 className="font-semibold mb-1 text-[var(--color-danger)]">Warnings</h2>
              <p className="text-[var(--color-ink-soft)] whitespace-pre-line">{product.warnings}</p>
            </section>
          )}
        </div>

        {publishedReviews.length > 0 && (
          <div className="mt-10 border-t border-[var(--color-border)] pt-6">
            <h2 className="font-display text-xl mb-4">Customer Reviews</h2>
            <div className="space-y-4">
              {publishedReviews.map((r: any) => (
                <div key={r.id} className="border-b border-[var(--color-border)] pb-4">
                  <p className="text-sm font-medium">★ {r.rating} {r.title && `— ${r.title}`}</p>
                  {r.body && <p className="text-sm text-[var(--color-ink-soft)] mt-1">{r.body}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
