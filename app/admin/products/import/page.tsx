// app/admin/products/import/page.tsx
import { requireAdmin } from '@/lib/admin/guard';
import { ImportForm } from '@/components/admin/ImportForm';

export default async function ProductImportPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase.from('categories').select('slug, name').order('sort_order');

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Bulk Import Products</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Upload a CSV to add many products at once. Each row creates one
        product with one variant — add extra sizes/variants afterward from
        each product's edit page. Photos still need to be uploaded per
        product after import (a CSV can't carry image files).
      </p>
      <ImportForm categories={categories ?? []} />
    </div>
  );
}
