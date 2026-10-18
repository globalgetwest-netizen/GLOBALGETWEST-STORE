// app/contact/page.tsx
// Contact us — an on-site form (delivered to support@globalgetwest.com) plus
// the regional WhatsApp agents, so customers never have to leave the site.
import { ContactForm } from '@/components/ContactForm';
import { CONTACTS, SUPPORT_EMAIL, whatsappLink } from '@/lib/contact';
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/contactTopics';

export const metadata = {
  title: 'Contact us — GLOBALGETWEST',
  description: 'Send GLOBALGETWEST a message or reach our regional agents on WhatsApp.',
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string; order?: string }> }) {
  const { topic, order } = await searchParams;
  const initialTopic = (CONTACT_TOPICS.some((t) => t.id === topic) ? topic : 'general') as ContactTopic;
  const initialOrder = (order ?? '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 30).toUpperCase();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="uppercase tracking-[0.2em] text-[var(--color-forest)] text-xs font-medium mb-3">Customer care</p>
      <h1 className="font-display text-4xl mb-3">Contact us</h1>
      <p className="text-[var(--color-ink-soft)] max-w-2xl mb-10">
        Questions about a product, an order or a payment? Send us a message below and we&apos;ll reply by email.
        For a faster answer, our regional agents are on WhatsApp.
      </p>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <ContactForm initialTopic={initialTopic} initialOrder={initialOrder} />

        <aside className="rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment-warm)] p-6">
          <h2 className="font-display text-xl mb-4">WhatsApp agents</h2>
          <ul className="space-y-4 text-sm">
            {Object.values(CONTACTS).map((region) => (
              <li key={region.label}>
                <p className="font-semibold text-[var(--color-ink)] mb-1">{region.label}</p>
                <ul className="space-y-1">
                  {region.agents.map((agent) => (
                    <li key={agent.phone}>
                      <a
                        href={whatsappLink(agent.whatsapp, 'Hello GLOBALGETWEST, I have a question.')}
                        target="_blank" rel="noopener noreferrer"
                        className="focus-ring text-[var(--color-forest)] font-medium hover:underline"
                      >
                        {agent.display}
                      </a>
                      {agent.role && <span className="text-[var(--color-ink-soft)]"> · {agent.role}</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-sm">
            <p className="font-semibold text-[var(--color-ink)] mb-1">Email</p>
            <p className="text-[var(--color-ink-soft)] select-all">{SUPPORT_EMAIL}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
