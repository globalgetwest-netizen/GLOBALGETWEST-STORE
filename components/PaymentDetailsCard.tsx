// components/PaymentDetailsCard.tsx
// Order-page instructions for agent-assisted payment (bank transfer or
// Western Union): amount, reference, step-by-step guide and the right
// contact buttons. Server component; the buttons are small client islands.
import type { AgentContact } from '@/lib/contact';
import { METHOD_LABEL, methodNote, paymentSteps, type ManualMethod } from '@/lib/paymentMethods';
import { CopyButton } from '@/components/CopyButton';
import { WhatsAppAction } from '@/components/WhatsAppAction';

export function PaymentDetailsCard({
  method, amountLabel, reference, contact,
}: {
  method: ManualMethod;
  amountLabel: string;
  reference: string;
  contact: AgentContact;
}) {
  const isWU = method === 'western_union';
  // Africa has a dedicated Western Union desk (agent 2, phone + WhatsApp);
  // everywhere else the regional agent handles both methods.
  const useWUDesk = isWU && contact.private;
  const agentIndex = useWUDesk ? 1 : 0;
  const contactName = useWUDesk ? 'Our Western Union desk' : `Your ${contact.label} agent`;
  const steps = paymentSteps(method, { amount: amountLabel, reference, contactName });

  const detailsMessage = isWU
    ? `Hello, I'd like to pay ${amountLabel} for order ${reference} by Western Union. Please send me the receiver details.`
    : `Hello, I've placed order ${reference} for ${amountLabel} and would like to pay by bank transfer. Please send me the bank details.`;
  const proofMessage = isWU
    ? `Hello, I've sent ${amountLabel} for order ${reference} by Western Union.\nMTCN: \nSender's full name: \nAmount sent: `
    : `Hello, I've paid ${amountLabel} for order ${reference} by bank transfer. My proof of payment is attached.`;

  return (
    <section className="mt-6 rounded-lg border border-[var(--color-border)] bg-white text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[var(--color-border)]">
        <h2 className="font-display text-xl">Payment details</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-parchment-warm)] border border-[var(--color-border)] px-3 py-1 text-xs font-semibold">
          {isWU ? <GlobeIcon /> : <BankIcon />}
          {METHOD_LABEL[method]}
        </span>
      </div>

      {/* Amount + reference */}
      <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)] bg-[var(--color-parchment-warm)]">
        <div className="px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-1">Amount due</p>
          <p className="font-display text-2xl tabular-nums">{amountLabel}</p>
        </div>
        <div className="px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-1">
            {isWU ? 'Your reference' : 'Payment reference'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-base tracking-wide">{reference}</p>
            <CopyButton value={reference} />
          </div>
        </div>
      </div>

      {/* Steps */}
      <ol className="px-6 py-5 space-y-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3.5">
            <span className="w-6 h-6 shrink-0 rounded-full bg-[var(--color-charcoal)] text-white text-xs font-semibold inline-flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-[var(--color-ink)]">{step.title}</p>
              <p className="text-[var(--color-ink-soft)] leading-relaxed">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Contact */}
      <div className="px-6 pb-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-2.5">
          {useWUDesk ? 'Western Union desk · Africa' : `${contact.label} agent`}
        </p>
        <div className={`grid gap-3 ${useWUDesk ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <WhatsAppAction
            whatsappNumber={contact.whatsapp}
            agentIndex={agentIndex}
            label={isWU ? 'Get receiver details' : 'Get bank details'}
            message={detailsMessage}
          />
          {useWUDesk && (
            <WhatsAppAction
              whatsappNumber=""
              agentIndex={1}
              call
              variant="secondary"
              label="Call the desk"
              message=""
            />
          )}
          <WhatsAppAction
            whatsappNumber={contact.whatsapp}
            agentIndex={agentIndex}
            variant="secondary"
            label={isWU ? 'Send your MTCN' : 'Send payment proof'}
            message={proofMessage}
          />
        </div>
      </div>

      {/* Note */}
      <p className="flex gap-2 px-6 py-3.5 border-t border-[var(--color-border)] bg-[var(--color-parchment-warm)] text-xs text-[var(--color-ink-soft)]">
        <ShieldIcon />
        {methodNote(method)}
      </p>
    </section>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5" aria-hidden="true">
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}
