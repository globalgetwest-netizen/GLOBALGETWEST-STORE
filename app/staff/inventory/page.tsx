// app/staff/inventory/page.tsx
import { requireStaff } from '@/lib/staff/guard';
import { InventoryManager } from '@/components/staff/InventoryManager';

export default async function StaffInventoryPage() {
  const { supabase } = await requireStaff();

  const [{ data: variants }, { data: stockRows }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id, sku, name, products ( name )')
      .eq('is_active', true)
      .order('name'),
    supabase.from('variant_stock').select('variant_id, stock_on_hand'),
  ]);

  const stockByVariant = new Map((stockRows ?? []).map((s) => [s.variant_id, s.stock_on_hand]));

  const rows = (variants ?? []).map((v: any) => ({
    id: v.id,
    sku: v.sku,
    name: v.name,
    productName: v.products?.name ?? '—',
    stock: stockByVariant.get(v.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Inventory</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Every adjustment is logged with a reason — nothing here silently overwrites a number.
      </p>
      <InventoryManager rows={rows} />
    </div>
  );
}
