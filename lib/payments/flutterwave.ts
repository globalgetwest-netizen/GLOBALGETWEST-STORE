// lib/payments/flutterwave.ts
// Flutterwave Standard (hosted payment page) — good fit for GHS/NGN, mobile money.
// Docs: https://developer.flutterwave.com/docs/making-payments/standard
import crypto from 'node:crypto';
import type {
  PaymentProvider, OrderForCheckout, CheckoutSession, VerifiedPaymentEvent,
} from './types';
import { PaymentError } from './types';

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

export const flutterwaveProvider: PaymentProvider = {
  gateway: 'flutterwave',

  supportedCurrencies() {
    // Flutterwave supports USD/GBP/EUR and 30+ currencies for international
    // cards, not just GHS/NGN — once international card acceptance is
    // approved on the account (a separate dashboard request after KYC),
    // this becomes the practical global default while Stripe access is
    // blocked (Stripe requires a US/UK-formed entity, not yet in place).
    return ['GHS', 'NGN', 'USD', 'GBP', 'EUR'];
  },

  async createCheckoutSession(order: OrderForCheckout): Promise<CheckoutSession> {
    const tx_ref = `ggw-${order.orderId}-${Date.now()}`;

    const res = await fetch(`${FLW_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref,
        // Flutterwave's amount field is in the currency's *major* unit (e.g. cedis, not pesewas)
        amount: (order.amountMinorUnits / 100).toFixed(2),
        currency: order.currency,
        redirect_url: order.successUrl,
        customer: {
          email: order.customerEmail,
          name: order.customerName,
        },
        customizations: {
          title: 'GLOBALGETWEST',
          description: `Order ${order.orderNumber}`,
        },
        meta: { order_id: order.orderId, order_number: order.orderNumber },
      }),
    });

    if (!res.ok) {
      throw new PaymentError(`Flutterwave checkout init failed: ${res.status}`, 'flutterwave', await res.text());
    }

    const data = await res.json();
    if (data.status !== 'success' || !data.data?.link) {
      throw new PaymentError('Flutterwave did not return a payment link', 'flutterwave', data);
    }

    return {
      gateway: 'flutterwave',
      gatewayReference: tx_ref,
      redirectUrl: data.data.link,
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent> {
    // Flutterwave sends a shared-secret hash in the 'verif-hash' header —
    // compare against the value you set as your webhook secret hash.
    const signature = headers.get('verif-hash');
    if (!signature || signature !== process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH) {
      throw new PaymentError('Invalid Flutterwave webhook signature', 'flutterwave');
    }

    const payload = JSON.parse(rawBody);
    const txData = payload.data;

    // Never trust the webhook amount/status blindly — re-verify server-side
    // against Flutterwave's own API using the transaction id, per their docs.
    const verifyRes = await fetch(`${FLW_BASE_URL}/transactions/${txData.id}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY!}` },
    });

    if (!verifyRes.ok) {
      throw new PaymentError('Failed to verify Flutterwave transaction', 'flutterwave', await verifyRes.text());
    }

    const verified = await verifyRes.json();
    const tx = verified.data;

    return {
      gateway: 'flutterwave',
      gatewayReference: tx.tx_ref,
      status: tx.status === 'successful' ? 'succeeded' : 'failed',
      currency: tx.currency,
      amountMinorUnits: Math.round(tx.amount * 100),
      rawPayload: payload,
    };
  },
};

// Flutterwave also supports HMAC-based verification on some webhook configs;
// keep this helper available if you switch from the shared verif-hash setup.
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
