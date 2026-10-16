'use client';
// components/WhatsAppAction.tsx
// A full-width button that opens WhatsApp to the regional agent with a
// message already written. Like ContactAgentButton, the link is built only
// on click, so the agent's number isn't rendered into the page's HTML.
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { whatsappLink } from '@/lib/contact';

export function WhatsAppAction({
  whatsappNumber, message, label, variant = 'primary',
}: {
  whatsappNumber: string; message: string; label: string; variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={() => window.open(whatsappLink(whatsappNumber, message), '_blank', 'noopener,noreferrer')}
      className={`focus-ring w-full inline-flex items-center justify-center gap-2 rounded px-5 py-3 font-semibold transition-colors ${
        variant === 'primary'
          ? 'bg-[var(--color-charcoal)] text-white hover:bg-black'
          : 'border border-[var(--color-charcoal)] text-[var(--color-ink)] hover:bg-[var(--color-parchment-warm)]'
      }`}
    >
      <WhatsAppIcon size={18} />
      {label}
    </button>
  );
}
