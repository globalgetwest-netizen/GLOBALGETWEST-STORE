// components/PaymentBadges.tsx
// Real official logo files for Mastercard, Visa, and Apple Pay (provided
// directly by the site owner from each brand's own assets). Google Pay and
// Mobile Money don't have a real logo file yet, so they stay as
// text-labeled badges until one is provided — this keeps every badge
// either genuinely accurate or clearly generic, never a guessed recreation.
import Image from 'next/image';

function TextBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-9 px-3 rounded border border-[var(--color-border)] bg-white text-[11px] font-semibold text-[var(--color-ink-soft)] tracking-wide whitespace-nowrap">
      {label}
    </div>
  );
}

export function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="h-9 px-2.5 flex items-center rounded border border-[var(--color-border)] bg-white">
        <Image src="/payment-icons/visa.png" alt="Visa" width={52} height={17} className="object-contain" />
      </div>
      <div className="h-9 px-2.5 flex items-center rounded border border-[var(--color-border)] bg-white">
        <Image src="/payment-icons/mastercard.png" alt="Mastercard" width={40} height={17} className="object-contain" />
      </div>
      <div className="h-9 px-2.5 flex items-center rounded border border-[var(--color-border)] bg-white">
        <Image src="/payment-icons/apple-pay.png" alt="Apple Pay" width={44} height={32} className="object-contain" />
      </div>
      <TextBadge label="Google Pay" />
      <TextBadge label="Mobile Money" />
    </div>
  );
}
