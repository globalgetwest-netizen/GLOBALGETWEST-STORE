// lib/paymentMethods.ts
// Agent-assisted payment methods (no online gateway): what they're called
// and the exact steps customers follow. Checkout, the order page and the
// invoice all render from here so the instructions never drift apart.

export type ManualMethod = 'bank_transfer' | 'western_union';

export const MANUAL_METHODS: ManualMethod[] = ['bank_transfer', 'western_union'];

export function isManualMethod(value: unknown): value is ManualMethod {
  return value === 'bank_transfer' || value === 'western_union';
}

export const METHOD_LABEL: Record<ManualMethod, string> = {
  bank_transfer: 'Bank transfer',
  western_union: 'Western Union',
};

/** One-line description shown on the checkout option. */
export function methodSummary(method: ManualMethod, agentLabel: string, hasWesternUnionDesk: boolean): string {
  return method === 'bank_transfer'
    ? `Pay from your bank account. Your ${agentLabel} agent sends our bank details on WhatsApp.`
    : `Send from any Western Union location, website or app. ${
      hasWesternUnionDesk ? 'Our Western Union desk' : `Your ${agentLabel} agent`
    } guides you by WhatsApp${hasWesternUnionDesk ? ' or phone' : ''}.`;
}

export interface PaymentStep { title: string; body: string }

export function paymentSteps(
  method: ManualMethod,
  ctx: { amount: string; reference: string; contactName: string },
): PaymentStep[] {
  if (method === 'western_union') {
    return [
      {
        title: 'Get the receiver details',
        body: `${ctx.contactName} gives you the receiver's full name and country.`,
      },
      {
        title: `Send ${ctx.amount}`,
        body: `Use any Western Union agent location, westernunion.com or the Western Union app. If asked for a message or reference, enter ${ctx.reference}.`,
      },
      {
        title: 'Share your MTCN',
        body: 'Send us the 10-digit MTCN tracking number from your receipt, the sender’s full name and the exact amount sent.',
      },
      {
        title: 'We confirm and ship',
        body: 'We verify the transfer with Western Union, email your receipt and dispatch your order.',
      },
    ];
  }
  return [
    {
      title: 'Request our bank details',
      body: `${ctx.contactName} sends the account details on WhatsApp.`,
    },
    {
      title: `Transfer ${ctx.amount}`,
      body: `Pay the exact amount and use ${ctx.reference} as the payment reference so we can match it to your order.`,
    },
    {
      title: 'Send your proof of payment',
      body: 'Share a photo or PDF of the transfer confirmation from your bank.',
    },
    {
      title: 'We confirm and ship',
      body: 'Once the funds arrive we email your receipt and dispatch your order.',
    },
  ];
}

/** Short note shown under the steps. */
export function methodNote(method: ManualMethod): string {
  return method === 'western_union'
    ? 'Western Union fees are paid by the sender, so please make sure the full amount is received. Only use receiver details given by the official contacts on this page.'
    : 'Bank charges are paid by the sender, so please make sure the full amount arrives. Only use bank details given by the official contacts on this page.';
}
