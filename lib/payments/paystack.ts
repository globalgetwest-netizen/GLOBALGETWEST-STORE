// lib/payments/paystack.ts
// Paystack Standard Checkout — works for Ghana-registered businesses today
// (unlike Flutterwave, which wasn't accepting onboarding at signup time).
// Docs: https://paystack.com/docs/payments/accept-payments/
import crypto from 'node:crypto';
import type {
  PaymentProvider, OrderForCheckout, CheckoutSession, VerifiedPaymentEvent,
} from './types';
import { PaymentError } from './types';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export const paystackProvider: PaymentProvider = {
  gateway: 'paystack',

  supportedCurrencies() {
    // GHS only, until USD settlement is confirmed enabled on this specific
    // Paystack account. Paystack requires each currency to be explicitly
    // authorized by their team — requesting an unauthorized currency risks
    // silently falling back to the account's base currency (GHS) on their
    // hosted checkout page, which is exactly wrong for an international
    // customer who should never see GHS. Add 'USD' back here only after
    // confirming with Paystack support that USD settlement is active.
    return ['GHS'];
  },

  async createCheckoutSession(order: OrderForCheckout): Promise<CheckoutSession> {
    const reference = `ggw-${order.orderId}-${Date.now()}`;

    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference,
        email: order.customerEmail,
        // Paystack amounts are in the currency's smallest unit (pesewas for
        // GHS, cents for USD) — same convention as amountMinorUnits already
        // uses, so no conversion needed here.
        amount: order.amountMinorUnits,
        currency: order.currency,
        callback_url: order.successUrl,
        metadata: { order_id: order.orderId, order_number: order.orderNumber },
      }),
    });

    if (!res.ok) {
      throw new PaymentError(`Paystack initialize failed: ${res.status}`, 'paystack', await res.text());
    }

    const data = await res.json();
    if (!data.status || !data.data?.authorization_url) {
      throw new PaymentError('Paystack did not return an authorization URL', 'paystack', data);
    }

    return {
      gateway: 'paystack',
      gatewayReference: reference,
      redirectUrl: data.data.authorization_url,
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent> {
    // Paystack signs webhooks with HMAC-SHA512 of the raw body using your
    // secret key — compare against the x-paystack-signature header.
    const signature = headers.get('x-paystack-signature');
    const expected = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex');

    if (!signature || signature !== expected) {
      throw new PaymentError('Invalid Paystack webhook signature', 'paystack');
    }

    const payload = JSON.parse(rawBody);
    const tx = payload.data;

    // Re-verify against Paystack's own API rather than trusting the webhook
    // payload alone — same defensive pattern as the Flutterwave adapter.
    const verifyRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${tx.reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}` },
    });

    if (!verifyRes.ok) {
      throw new PaymentError('Failed to verify Paystack transaction', 'paystack', await verifyRes.text());
    }

    const verified = await verifyRes.json();
    const verifiedTx = verified.data;

    return {
      gateway: 'paystack',
      gatewayReference: verifiedTx.reference,
      status: verifiedTx.status === 'success' ? 'succeeded' : 'failed',
      currency: verifiedTx.currency,
      amountMinorUnits: verifiedTx.amount,
      rawPayload: payload,
    };
  },
};
