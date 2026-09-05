'use client';
// components/ContactAgentButton.tsx
import { useState } from 'react';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { whatsappLink } from '@/lib/contact';

interface Props {
  label: string;
  phone: string;
  whatsappNumber: string;
  message: string;
  /** If true, the number shows right away (used for the non-sensitive
   * contact). If false, nothing about the number renders until the user
   * clicks — it isn't in the page's initial HTML/DOM at all until then. */
  revealImmediately?: boolean;
}

export function ContactAgentButton({ label, phone, whatsappNumber, message, revealImmediately = false }: Props) {
  const [revealed, setRevealed] = useState(revealImmediately);

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="focus-ring flex items-center gap-2 text-sm hover:text-[var(--color-forest)] hover:underline"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-label="Active" />
        <WhatsAppIcon size={16} />
        Chat with Agent — {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-label="Active" />
      <WhatsAppIcon size={16} />
      <a
        href={whatsappLink(whatsappNumber, message)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-[var(--color-forest)] hover:underline"
      >
        {label}: {phone}
      </a>
    </div>
  );
}
