// components/Header.tsx
import Link from 'next/link';
import Image from 'next/image';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function Header() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-forest)] text-[var(--color-parchment)]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center gap-6 h-16">
          <Link href="/" className="focus-ring flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="GLOBALGETWEST" width={36} height={36} className="rounded-full" priority />
            <span className="font-display text-xl tracking-tight">GLOBALGETWEST</span>
          </Link>

          <form action="/search" className="flex-1 max-w-2xl">
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="Search herbal products, ingredients, conditions..."
              className="focus-ring w-full rounded-md px-3.5 py-2 text-[var(--color-ink)] bg-[var(--color-parchment)] placeholder:text-[var(--color-ink-soft)] text-sm"
            />
          </form>

          <nav className="flex items-center gap-5 text-sm shrink-0">
            {user ? (
              <>
                <Link href="/account/orders" className="focus-ring hover:text-[var(--color-ochre-light)]">
                  Orders
                </Link>
                <Link href="/account" className="focus-ring hover:text-[var(--color-ochre-light)]">
                  Account
                </Link>
              </>
            ) : (
              <Link href="/account/sign-in" className="focus-ring hover:text-[var(--color-ochre-light)]">
                Sign In
              </Link>
            )}
            <Link href="/cart" className="focus-ring hover:text-[var(--color-ochre-light)] font-medium">
              Cart
            </Link>
          </nav>
        </div>

        <nav className="flex gap-5 h-10 items-center text-[13px] border-t border-white/10 overflow-x-auto">
          <Link href="/products" className="focus-ring whitespace-nowrap hover:text-[var(--color-ochre-light)]">
            All Products
          </Link>
          <Link href="/products?category=immune-support" className="focus-ring whitespace-nowrap hover:text-[var(--color-ochre-light)]">
            Immune Support
          </Link>
          <Link href="/products?category=liver-detox" className="focus-ring whitespace-nowrap hover:text-[var(--color-ochre-light)]">
            Liver &amp; Detox
          </Link>
          <Link href="/products?category=digestive-health" className="focus-ring whitespace-nowrap hover:text-[var(--color-ochre-light)]">
            Digestive Health
          </Link>
          <Link href="/products?category=teas-tinctures" className="focus-ring whitespace-nowrap hover:text-[var(--color-ochre-light)]">
            Teas &amp; Tinctures
          </Link>
        </nav>
      </div>
    </header>
  );
}
