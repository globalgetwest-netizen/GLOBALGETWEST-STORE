// lib/payments/grey.ts
//
// ⚠️ IMPORTANT — read before wiring this up:
// Grey (grey.co) is a multi-currency BUSINESS ACCOUNT + payout/treasury
// platform (USD/EUR/GBP balances, local payouts to 170+ countries, USDC
// deposits over BEP20/Solana, virtual cards). It is NOT a customer-facing
// hosted checkout product the way Stripe Checkout or Flutterwave Standard
// are — there's no public "create a payment link a customer pays with a
// card" endpoint in what's publicly documented.
//
// What Grey *can* realistically do for this store, today:
//   1. Accept USDC crypto payments from customers who send to a Grey
//      deposit address (BEP20/Solana) — a real checkout option for
//      crypto-comfortable customers.
//   2. Hold multi-currency balances and pay out to vendors/staff/logistics
//      — useful for the back office, not customer checkout.
//
// This adapter implements option 1 (USDC deposit-based payment) as the
// "grey" checkout path. Before going live, confirm the exact deposit-address
// and webhook contract against your Grey Business dashboard / API docs —
// I don't have access to a public Grey API reference to verify field names,
// so treat the request/response shapes below as a starting scaffold, not
// verified-correct code, and adjust once you have Grey API credentials and
// their actual docs in front of you.

import type {
  PaymentProvider, OrderForCheckout, CheckoutSession, VerifiedPaymentEvent,
} from './types';
import { PaymentError } from './types';

const GREY_BASE_URL = process.env.GREY_API_BASE_URL ?? 'https://api.grey.co/v1';

export const greyProvider: PaymentProvider = {
  gateway: 'grey',

  supportedCurrencies() {
    // USDC is treated as a "currency" here for the checkout flow, priced
    // 1:1 against USD at order time.
    return ['USDC'];
  },

  async createCheckoutSession(order: OrderForCheckout): Promise<CheckoutSession> {
    const reference = `ggw-${order.orderId}-${Date.now()}`;

    const res = await fetch(`${GREY_BASE_URL}/payments/deposit-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GREY_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference,
        asset: 'USDC',
        network: 'BEP20',
        amount: (order.amountMinorUnits / 100).toFixed(2), // USD-denominated amount, USDC 1:1
        customer_email: order.customerEmail,
        callback_url: order.successUrl,
      }),
    });

    if (!res.ok) {
      throw new PaymentError(`Grey deposit request failed: ${res.status}`, 'grey', await res.text());
    }

    const data = await res.json();

    // Expect a hosted page or QR/address page URL back — adjust field name
    // once confirmed against Grey's real response shape.
    const redirectUrl = data.payment_url ?? data.hosted_url;
    if (!redirectUrl) {
      throw new PaymentError('Grey did not return a payment URL', 'grey', data);
    }

    return {
      gateway: 'grey',
      gatewayReference: reference,
      redirectUrl,
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent> {
    const signature = headers.get('x-grey-signature');
    if (!signature || signature !== process.env.GREY_WEBHOOK_SECRET) {
      throw new PaymentError('Invalid Grey webhook signature', 'grey');
    }

    const payload = JSON.parse(rawBody);

    return {
      gateway: 'grey',
      gatewayReference: payload.reference,
      status: payload.status === 'completed' ? 'succeeded' : 'failed',
      currency: 'USDC',
      amountMinorUnits: Math.round(Number(payload.amount) * 100),
      rawPayload: payload,
    };
  },
};
