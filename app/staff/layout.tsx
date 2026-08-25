// app/staff/layout.tsx
import Link from 'next/link';
import { requireStaff } from '@/lib/staff/guard';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-parchment)' }}>
      <aside className="w-56 shrink-0 bg-[var(--color-forest)] text-[var(--color-parchment)] p-5 flex flex-col">
        <Link href="/staff" className="font-display text-lg mb-8 block">
          GLOBALGETWEST
          <span className="block text-xs font-sans text-[var(--color-ochre-light)] tracking-wide mt-0.5">
            STAFF
          </span>
        </Link>

        <nav className="space-y-1 text-sm flex-1">
          <StaffNavLink href="/staff">My Queue</StaffNavLink>
          <StaffNavLink href="/staff/orders">All Orders</StaffNavLink>
          <StaffNavLink href="/staff/inventory">Inventory</StaffNavLink>
        </nav>

        <div className="pt-4 border-t border-white/10 text-xs text-[var(--color-parchment)]/70">
          Signed in as<br />
          <strong className="text-[var(--color-parchment)]">{profile.full_name ?? 'Staff'}</strong>
          {profile.department && <span className="block capitalize">{profile.department}</span>}
          <form action="/account/sign-out" method="POST" className="mt-2">
            <button className="focus-ring text-[var(--color-ochre-light)] hover:underline">Sign out</button>
          </form>
          <Link href="/" className="focus-ring block mt-2 hover:underline">← Back to store</Link>
        </div>
      </aside>

      <main className="flex-1 p-8 max-w-6xl">{children}</main>
    </div>
  );
}

function StaffNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="focus-ring block px-3 py-2 rounded-md hover:bg-white/10 transition-colors">
      {children}
    </Link>
  );
}
