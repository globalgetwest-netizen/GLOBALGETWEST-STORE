// components/Footer.tsx
import Image from 'next/image';
import { CONTACTS, SUPPORT_EMAIL } from '@/lib/contact';
import { ContactAgentButton } from '@/components/ContactAgentButton';
import { TikTokIcon } from '@/components/TikTokIcon';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-parchment-warm)]">
      <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-1 sm:grid-cols-4 gap-8 text-sm text-[var(--color-ink-soft)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Image src="/logo.png" alt="GLOBALGETWEST" width={28} height={28} className="rounded-full" />
            <h4 className="font-display text-[var(--color-ink)]">GLOBALGETWEST</h4>
          </div>
          <p className="mb-3">Natural herbal products, shipped worldwide.</p>
          <a
            href="https://www.tiktok.com/@globalgetwest"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[var(--color-forest)] hover:underline"
          >
            <TikTokIcon size={16} />
            @globalgetwest
          </a>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--color-ink)] mb-2">Customer Care</h4>
          <ul className="space-y-1">
            <li>Shipping &amp; delivery</li>
            <li>Order support</li>
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[var(--color-forest)] hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--color-ink)] mb-2">WhatsApp Support</h4>
          <ul className="space-y-2.5">
            <li>
              <ContactAgentButton
                label={CONTACTS.usEurope.label}
                phone={CONTACTS.usEurope.phone}
                whatsappNumber={CONTACTS.usEurope.whatsapp}
                message="Hi, I have a question about GLOBALGETWEST."
                revealImmediately
              />
            </li>
            <li>
              <ContactAgentButton
                label={CONTACTS.asiaAfrica.label}
                phone={CONTACTS.asiaAfrica.phone}
                whatsappNumber={CONTACTS.asiaAfrica.whatsapp}
                message="Hi, I have a question about GLOBALGETWEST."
              />
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--color-ink)] mb-2">Company</h4>
          <ul className="space-y-1">
            <li>About GLOBALGETWEST</li>
            <li>Sourcing &amp; quality</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-ink-soft)]">
        © {new Date().getFullYear()} GLOBALGETWEST. All rights reserved.
      </div>
    </footer>
  );
}
