// components/SecureCheckoutNote.tsx
// Small reassurance block shown beside cart and checkout totals: what's
// protected and how people can pay. Uses the same truthful badge set as the
// footer (Apple Pay / Google Pay only when switched on).
import { PaymentBadges } from '@/components/PaymentBadges';

export function SecureCheckoutNote() {
  return (
    <div className="mt-5 pt-5 border-t border-[var(--color-border)] space-y-3">
      <p className="flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Secure, encrypted payment. We never see your card details.
      </p>
      <PaymentBadges />
    </div>
  );
}
