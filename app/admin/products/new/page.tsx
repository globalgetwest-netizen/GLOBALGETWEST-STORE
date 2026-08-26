// app/admin/products/new/page.tsx
import { requireAdmin } from '@/lib/admin/guard';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase.from('categories').select('id, name').order('sort_order');

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">New Product</h1>
      <ProductForm categories={categories ?? []} />
    </div>
  );
}
