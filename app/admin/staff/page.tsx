// app/admin/staff/page.tsx
import { requireAdmin } from '@/lib/admin/guard';
import { StaffManager } from '@/components/admin/StaffManager';

export default async function AdminStaffPage() {
  const { supabase } = await requireAdmin();

  const { data: staffAndAdmins } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, department, is_active, created_at')
    .in('role', ['staff', 'admin'])
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Staff Accounts</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        There's no self-serve staff signup. To add staff: they sign up as a regular
        customer first (via the normal sign-up page), then you promote their account
        here by email.
      </p>
      <StaffManager initial={staffAndAdmins ?? []} />
    </div>
  );
}
