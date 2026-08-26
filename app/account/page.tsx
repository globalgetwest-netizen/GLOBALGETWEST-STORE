// app/account/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseServerClient } from '@/lib/supabase/server';

export default async function AccountPage() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/account/sign-in?next=/account');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, role')
    .eq('id', user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-3xl mb-8">Your Account</h1>

      <div className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60 mb-6">
        <p className="text-sm text-[var(--color-ink-soft)] mb-1">Name</p>
        <p className="font-medium mb-4">{profile?.full_name ?? '—'}</p>
        <p className="text-sm text-[var(--color-ink-soft)] mb-1">Email</p>
        <p className="font-medium">{user.email}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/account/orders" className="focus-ring text-sm text-[var(--color-forest)] font-medium hover:underline">
          View order history →
        </Link>
        {(profile?.role === 'staff' || profile?.role === 'admin') && (
          <Link href="/staff" className="focus-ring text-sm text-[var(--color-forest)] font-medium hover:underline">
            Go to staff portal →
          </Link>
        )}
        {profile?.role === 'admin' && (
          <Link href="/admin" className="focus-ring text-sm text-[var(--color-forest)] font-medium hover:underline">
            Go to admin portal →
          </Link>
        )}
      </div>

      <form action="/account/sign-out" method="POST" className="mt-8">
        <button className="focus-ring text-sm text-[var(--color-danger)] hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
