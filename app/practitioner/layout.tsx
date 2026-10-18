// app/practitioner/layout.tsx
// Portal for licensed practitioners. Only verified practitioners get in;
// each page also checks two-step sign-in before showing any record.
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { requirePractitionerSession } from '@/lib/health/access';

export const metadata: Metadata = { title: 'Practitioner portal — GLOBALGETWEST', robots: { index: false, follow: false } };

export default async function PractitionerLayout({ children }: { children: React.ReactNode }) {
  const { practitioner } = await requirePractitionerSession();

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--color-parchment)' }}>
      <aside className="md:w-56 shrink-0 bg-[var(--color-forest)] text-[var(--color-parchment)] p-5 flex flex-col">
        <Link href="/practitioner" className="focus-ring flex items-center gap-2.5 mb-6 md:mb-8">
          <Image src="/logo.png" alt="GLOBALGETWEST" width={32} height={32} className="rounded-full shrink-0" priority />
          <span className="font-display text-lg leading-tight">
            GLOBALGETWEST
            <span className="block text-xs font-sans text-[var(--color-ochre-light)] tracking-wide mt-0.5">PRACTITIONER</span>
          </span>
        </Link>

        <nav className="flex md:block gap-1 md:space-y-1 text-sm flex-1">
          <NavLink href="/practitioner">My caseload</NavLink>
          <NavLink href="/practitioner/patients/new">New patient</NavLink>
        </nav>

        <div className="hidden md:block pt-4 border-t border-white/10 text-xs text-[var(--color-parchment)]/70">
          Signed in as<br />
          <strong className="text-[var(--color-parchment)]">{practitioner.display_name}</strong>
          <span className="block">Licence {practitioner.license_number}</span>
          <form action="/account/sign-out" method="POST" className="mt-2">
            <button className="focus-ring text-[var(--color-ochre-light)] hover:underline">Sign out</button>
          </form>
          <Link href="/account" className="focus-ring block mt-2 hover:underline">← My account</Link>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-5xl min-w-0">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="focus-ring block px-3 py-2 rounded-md hover:bg-white/10 transition-colors">
      {children}
    </Link>
  );
}
