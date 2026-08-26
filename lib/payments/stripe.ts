// lib/payments/stripe.ts
import Stripe from 'stripe';
import type {
  PaymentProvider, OrderForCheckout, CheckoutSession, VerifiedPaymentEvent,
} from './types';
import { PaymentError } from './types';

// Created lazily, not at module load — this file gets imported during
// Next.js's build-time page analysis even for routes that never actually
// run, so constructing the Stripe client eagerly breaks the build whenever
// STRIPE_SECRET_KEY isn't set (e.g. before you have a real Stripe account).
let stripeClient: Stripe | null = null;
function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new PaymentError('STRIPE_SECRET_KEY is not set', 'stripe');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-07-29.dahlia',
    });
  }
  return stripeClient;
}

export const stripeProvider: PaymentProvider = {
  gateway: 'stripe',

  supportedCurrencies() {
    // Stripe handles most currencies well; keep this explicit and short —
    // add more only after confirming settlement/payout support for your account.
    return ['USD'];
  },

  async createCheckoutSession(order: OrderForCheckout): Promise<CheckoutSession> {
    try {
      const session = await getStripeClient().checkout.sessions.create({
        mode: 'payment',
        customer_email: order.customerEmail,
        client_reference_id: order.orderId,
        line_items: [
          {
            price_data: {
              currency: order.currency.toLowerCase(),
              unit_amount: order.amountMinorUnits,
              product_data: { name: `GLOBALGETWEST Order ${order.orderNumber}` },
            },
            quantity: 1,
          },
        ],
        success_url: order.successUrl,
        cancel_url: order.cancelUrl,
        metadata: { order_id: order.orderId, order_number: order.orderNumber },
      });

      if (!session.url) {
        throw new PaymentError('Stripe session created without a redirect URL', 'stripe');
      }

      return {
        gateway: 'stripe',
        gatewayReference: session.id,
        redirectUrl: session.url,
      };
    } catch (err) {
      throw new PaymentError('Failed to create Stripe checkout session', 'stripe', err);
    }
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent> {
    const signature = headers.get('stripe-signature');
    if (!signature) {
      throw new PaymentError('Missing stripe-signature header', 'stripe');
    }

    let event: Stripe.Event;
    try {
      event = getStripeClient().webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      throw new PaymentError('Invalid Stripe webhook signature', 'stripe', err);
    }

    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.expired') {
      // Caller should treat this as "nothing to do" rather than an error —
      // Stripe sends many event types we don't act on.
      return {
        gateway: 'stripe',
        gatewayReference: (event.data.object as Stripe.Checkout.Session).id ?? 'unknown',
        status: 'failed',
        currency: 'USD',
        amountMinorUnits: 0,
        rawPayload: event,
      };
    }

    const session = event.data.object as Stripe.Checkout.Session;

    return {
      gateway: 'stripe',
      gatewayReference: session.id,
      status: event.type === 'checkout.session.completed' && session.payment_status === 'paid'
        ? 'succeeded'
        : 'failed',
      currency: (session.currency ?? 'usd').toUpperCase(),
      amountMinorUnits: session.amount_total ?? 0,
      rawPayload: event,
    };
  },
};
