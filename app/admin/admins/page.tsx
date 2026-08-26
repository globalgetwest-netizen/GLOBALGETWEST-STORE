// app/admin/admins/page.tsx
import { requireCeo } from '@/lib/admin/guard';
import { AdminManager } from '@/components/admin/AdminManager';

export default async function AdminAccountsPage() {
  const { supabase } = await requireCeo();

  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at')
    .in('role', ['admin', 'ceo'])
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Admin Accounts</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Only the CEO account can promote someone to Admin or deactivate one —
        this page is not visible to Admin accounts themselves.
      </p>
      <AdminManager initial={admins ?? []} />
    </div>
  );
}
