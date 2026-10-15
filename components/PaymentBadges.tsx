// components/PaymentBadges.tsx
// Real official logo files for Visa, Mastercard, Apple Pay, Google Pay, and
// MTN MoMo — all provided directly by the site owner from each brand's own
// assets, not recreated or guessed.
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
];

export function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {BADGES.filter((b) => b.show).map((b) => (
        <div key={b.alt} className="h-9 px-2.5 flex items-center rounded border border-[var(--color-border)] bg-white">
          <Image src={b.src} alt={b.alt} width={b.width} height={b.height} className="object-contain" />
        </div>
      ))}
    </div>
  );
}
