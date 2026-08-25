// components/Footer.tsx
export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-parchment-warm)]">
      <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm text-[var(--color-ink-soft)]">
        <div>
          <h4 className="font-display text-[var(--color-ink)] mb-2">GLOBALGETWEST</h4>
          <p>Natural herbal products, shipped worldwide.</p>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--color-ink)] mb-2">Customer Care</h4>
          <ul className="space-y-1">
            <li>Shipping &amp; delivery</li>
            <li>Returns &amp; refunds</li>
            <li>Contact support</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--color-ink)] mb-2">Company</h4>
          <ul className="space-y-1">
            <li>About GLOBALGETWEST</li>
            <li>Sourcing &amp; quality</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-ink-soft)]">
        © {new Date().getFullYear()} GLOBALGETWEST. All rights reserved.
      </div>
    </footer>
  );
}
