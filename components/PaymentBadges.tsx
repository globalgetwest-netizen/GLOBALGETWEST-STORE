// components/PaymentBadges.tsx
// Generic, clearly-labeled payment method badges — NOT official trademarked
// logo artwork (Visa/Mastercard/Apple Pay/Google Pay marks are registered
// trademarks; reproducing their exact logos isn't something to hand-build).
// For pixel-accurate official brand marks later, use a licensed icon set
// (e.g. the "payment-icons" or "react-payment-icons" npm packages, or
// Font Awesome's official brand icon set) and swap the SVGs in this file —
// the layout/sizing here is already built to drop those in directly.

function Badge({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-center h-9 px-3 rounded border border-[var(--color-border)] bg-white text-[11px] font-semibold text-[var(--color-ink-soft)] tracking-wide whitespace-nowrap">
      {label}
      {sub && <span className="ml-1 font-normal text-[var(--color-ink-muted)]">{sub}</span>}
    </div>
  );
}

export function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge label="VISA" />
      <Badge label="Mastercard" />
      <Badge label="Apple Pay" />
      <Badge label="Google Pay" />
      <Badge label="Mobile Money" />
    </div>
  );
}
