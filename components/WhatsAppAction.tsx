'use client';
// components/WhatsAppAction.tsx
// A full-width button that opens WhatsApp to the regional agent with a
// message already written. The link is built only on click; for the
// private (Africa) agent the number itself is fetched on click, so it is
// never in the page or the site's JavaScript.
import { useState } from 'react';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { loadPrivateContactNumber, whatsappLink } from '@/lib/contact';

export function WhatsAppAction({
  whatsappNumber, message, label, variant = 'primary',
}: {
  /** Empty for the private (Africa) agent — loaded on click. */
  whatsappNumber: string; message: string; label: string; variant?: 'primary' | 'secondary';
}) {
  const [busy, setBusy] = useState(false);

  async function open() {
    if (whatsappNumber) {
      window.open(whatsappLink(whatsappNumber, message), '_blank', 'noopener,noreferrer');
      return;
    }
    // Open the tab synchronously (so pop-up blockers allow it), then point
    // it at WhatsApp once the number has loaded.
    const tab = window.open('', '_blank');
    setBusy(true);
    try {
      const { whatsapp } = await loadPrivateContactNumber();
      const url = whatsappLink(whatsapp, message);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      tab?.close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className={`focus-ring w-full inline-flex items-center justify-center gap-2 rounded px-5 py-3 font-semibold transition-colors disabled:opacity-60 ${
        variant === 'primary'
          ? 'bg-[var(--color-charcoal)] text-white hover:bg-black'
          : 'border border-[var(--color-charcoal)] text-[var(--color-ink)] hover:bg-[var(--color-parchment-warm)]'
      }`}
    >
      <WhatsAppIcon size={18} />
      {busy ? 'Opening WhatsApp…' : label}
    </button>
  );
}
