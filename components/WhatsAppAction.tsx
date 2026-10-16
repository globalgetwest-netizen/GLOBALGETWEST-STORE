'use client';
// components/WhatsAppAction.tsx
// A full-width button that contacts the regional agent — on WhatsApp with a
// message already written, or by phone call.
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { telLink, whatsappLink } from '@/lib/contact';

export function WhatsAppAction({
  whatsappNumber, message, label, variant = 'primary', call = false, phone = '',
}: {
  whatsappNumber: string;
  message: string;
  label: string;
  variant?: 'primary' | 'secondary';
  /** Phone call instead of WhatsApp (uses `phone`). */
  call?: boolean;
  phone?: string;
}) {
  function open() {
    if (call) window.location.href = telLink(phone);
    else window.open(whatsappLink(whatsappNumber, message), '_blank', 'noopener,noreferrer');
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`focus-ring w-full inline-flex items-center justify-center gap-2 rounded px-5 py-3 font-semibold transition-colors ${
        variant === 'primary'
          ? 'bg-[var(--color-charcoal)] text-white hover:bg-black'
          : 'border border-[var(--color-charcoal)] text-[var(--color-ink)] hover:bg-[var(--color-parchment-warm)]'
      }`}
    >
      {call ? (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </svg>
      ) : (
        <WhatsAppIcon size={18} />
      )}
      {label}
    </button>
  );
}
