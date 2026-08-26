// app/admin/categories/page.tsx
import { requireAdmin } from '@/lib/admin/guard';
import { CategoryManager } from '@/components/admin/CategoryManager';

export default async function AdminCategoriesPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, is_active, sort_order')
    .order('sort_order');

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Categories</h1>
      <CategoryManager initial={categories ?? []} />
    </div>
  );
}
