// lib/payments/types.ts
// Gateway-agnostic contract. Every provider (Stripe, Flutterwave, Grey)
// implements this so checkout code and webhook handlers never branch on
// "which gateway" — they just call PaymentProvider methods.

export type PaymentGateway = 'stripe' | 'flutterwave' | 'grey' | 'paystack';

export interface OrderForCheckout {
  orderId: string;
  orderNumber: string;
  currency: string;          // ISO 4217, e.g. 'USD' | 'GHS' | 'NGN'
  amountMinorUnits: number;  // amount in the charge currency's minor units (cents/pesewas/kobo)
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  gateway: PaymentGateway;
  gatewayReference: string;  // session/tx id from the provider
  redirectUrl: string;       // where to send the browser to pay
}

// Normalized result after verifying a webhook/callback, regardless of gateway.
export interface VerifiedPaymentEvent {
  gateway: PaymentGateway;
  gatewayReference: string;
  status: 'succeeded' | 'failed';
  currency: string;
  amountMinorUnits: number;
  rawPayload: unknown;
}

export interface PaymentProvider {
  readonly gateway: PaymentGateway;

  /** Currencies this gateway is allowed to charge in this deployment. */
  supportedCurrencies(): string[];

  /** Create a hosted checkout session and return the URL to redirect to. */
  createCheckoutSession(order: OrderForCheckout): Promise<CheckoutSession>;

  /**
   * Verify an inbound webhook request is authentically from the gateway
   * (signature check) and normalize its payload. Throws on invalid signature.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent>;
}

export class PaymentError extends Error {
  constructor(message: string, public gateway: PaymentGateway, public cause?: unknown) {
    super(message);
    this.name = 'PaymentError';
  }
}
