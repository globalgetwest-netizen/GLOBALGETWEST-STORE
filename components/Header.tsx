// components/Header.tsx
import Link from 'next/link';
import Image from 'next/image';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function Header() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Nav categories now pulled live from the database — editing, renaming, or
  // deactivating a category in /admin/categories updates this automatically.
  // Previously these 4 links were hardcoded text, completely disconnected
  // from the actual categories table, which is why admin changes never
  // showed up here. Capped to a curated set (by sort_order) so the nav bar
  // stays clean as the catalog grows, rather than dumping every category.
  const { data: navCategories } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('is_active', true)
    .order('sort_order')
    .limit(6);

  return (
    <header className="sticky top-0 z-40 bg-white text-[var(--color-ink)] border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-[1600px] px-4">
        <div className="flex items-center gap-6 h-16">
          <Link href="/" className="focus-ring flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="GLOBALGETWEST" width={36} height={36} className="rounded-full" priority />
            <span className="font-display text-xl tracking-tight text-[var(--color-ink)]">GLOBALGETWEST</span>
          </Link>

          <form action="/search" className="flex-1 max-w-2xl">
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="Search products, categories and wellness"
              className="focus-ring w-full rounded px-3.5 py-2 text-[var(--color-ink)] bg-[var(--color-parchment-warm)] border border-[var(--color-border)] placeholder:text-[var(--color-ink-soft)] text-sm"
            />
          </form>

          <nav className="flex items-center gap-5 text-sm shrink-0">
            {user ? (
              <>
                <Link href="/account/orders" className="focus-ring text-[var(--color-ink-soft)] hover:text-[var(--color-forest)]">
                  Orders
                </Link>
                <Link href="/account" className="focus-ring text-[var(--color-ink-soft)] hover:text-[var(--color-forest)]">
                  Account
                </Link>
              </>
            ) : (
              <Link href="/account/sign-in" className="focus-ring text-[var(--color-ink-soft)] hover:text-[var(--color-forest)]">
                Sign In
              </Link>
            )}
            <Link href="/cart" className="focus-ring text-[var(--color-ink)] hover:text-[var(--color-forest)] font-medium">
              Cart
            </Link>
          </nav>
        </div>

        <nav className="flex gap-5 h-10 items-center text-[13px] border-t border-[var(--color-border)] overflow-x-auto">
          <Link href="/products" className="focus-ring whitespace-nowrap text-[var(--color-ink-soft)] hover:text-[var(--color-forest)]">
            All Products
          </Link>
          {(navCategories ?? []).map((c) => (
            <Link
              key={c.slug}
              href={`/products?category=${c.slug}`}
              className="focus-ring whitespace-nowrap text-[var(--color-ink-soft)] hover:text-[var(--color-forest)]"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
