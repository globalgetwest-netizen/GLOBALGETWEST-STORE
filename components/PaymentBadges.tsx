// components/PaymentBadges.tsx
// Real logo files for Visa, Mastercard, Apple Pay, Google Pay, MTN MoMo,
// Western Union and the bank-transfer mark — all provided directly by the
// site owner, not recreated or guessed.
//
// Apple Pay and Google Pay only show once they're actually switched on with
// a payment provider, so the footer never promises a wallet checkout can't
// offer. Turn each on in Vercel → Settings → Environment Variables:
//   ACCEPTS_APPLE_PAY=true   (after enabling Apple Pay in Paystack/Stripe)
//   ACCEPTS_GOOGLE_PAY=true  (after enabling Google Pay in Flutterwave/Stripe)
import Image from 'next/image';

const BADGES = [
  { src: '/payment-icons/visa.png', alt: 'Visa', width: 52, height: 17, show: true },
  { src: '/payment-icons/mastercard.png', alt: 'Mastercard', width: 40, height: 17, show: true },
  { src: '/payment-icons/apple-pay.png', alt: 'Apple Pay', width: 44, height: 32, show: process.env.ACCEPTS_APPLE_PAY === 'true' },
  { src: '/payment-icons/google-pay.png', alt: 'Google Pay', width: 52, height: 28, show: process.env.ACCEPTS_GOOGLE_PAY === 'true' },
  { src: '/payment-icons/momo.png', alt: 'MTN MoMo', width: 64, height: 30, show: true },
  { src: '/payment-icons/western-union.png', alt: 'Western Union', width: 56, height: 27, show: true },
];

const frame = 'h-9 px-2.5 flex items-center rounded border border-[var(--color-border)] bg-white';

export function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {BADGES.filter((b) => b.show).map((b) => (
        <div key={b.alt} className={frame}>
          <Image src={b.src} alt={b.alt} width={b.width} height={b.height} className="object-contain" />
        </div>
      ))}
      {/* The bank mark is an illustration rather than a wordmark, so it
          carries a short label to read clearly at badge size. */}
      <div className={`${frame} gap-1.5`}>
        <Image src="/payment-icons/bank-transfer.png" alt="" width={30} height={26} className="object-contain" />
        <span className="text-[11px] font-semibold tracking-wide text-[var(--color-ink)]">Bank transfer</span>
      </div>
    </div>
  );
}
