'use client';
// components/admin/ProductRow.tsx
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatUsd } from '@/lib/format';

interface Product {
  id: string; name: string; is_active: boolean; is_featured: boolean;
  product_variants: { price_usd_cents: number }[];
}

export function ProductRow({ product }: { product: Product }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const prices = product.product_variants.map((v) => v.price_usd_cents);

  async function handleDeactivate() {
    if (!confirm(`Deactivate "${product.name}"? It will be hidden from the storefront but existing orders keep their record of it. This can be undone from the edit page.`)) {
      return;
    }
    setBusy(true);
    await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <tr className="border-t border-[var(--color-border)]">
      <td className="px-4 py-2.5 font-medium">{product.name}</td>
      <td className="px-4 py-2.5">{prices.length ? formatUsd(Math.min(...prices)) : '—'}</td>
      <td className="px-4 py-2.5">
        <span className={`text-xs px-2 py-0.5 rounded-full ${product.is_active ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}`}>
          {product.is_active ? 'Active' : 'Inactive'}
        </span>
        {product.is_featured && (
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-ochre)]/15 text-[var(--color-ochre)]">
            Featured
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right space-x-3">
        <Link href={`/admin/products/${product.id}/edit`} className="focus-ring text-[var(--color-forest)] hover:underline">
          Edit
        </Link>
        {product.is_active && (
          <button
            onClick={handleDeactivate}
            disabled={busy}
            className="focus-ring text-[var(--color-danger)] hover:underline disabled:opacity-50"
          >
            {busy ? 'Deactivating…' : 'Deactivate'}
          </button>
        )}
      </td>
    </tr>
  );
}
