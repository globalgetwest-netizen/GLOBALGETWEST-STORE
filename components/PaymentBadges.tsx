// components/PaymentBadges.tsx
// Real official logo files for Visa, Mastercard, Apple Pay, Google Pay, and
// MTN MoMo — all provided directly by the site owner from each brand's own
// assets, not recreated or guessed. Every badge here is genuinely accurate.
import Image from 'next/image';

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
      <div className="h-9 px-2.5 flex items-center rounded border border-[var(--color-border)] bg-white">
        <Image src="/payment-icons/google-pay.png" alt="Google Pay" width={52} height={28} className="object-contain" />
      </div>
      <div className="h-9 px-2.5 flex items-center rounded border border-[var(--color-border)] bg-white">
        <Image src="/payment-icons/momo.png" alt="MTN MoMo" width={64} height={30} className="object-contain" />
      </div>
    </div>
  );
}
