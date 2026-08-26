// lib/payments/index.ts
// Single entry point the rest of the app uses — checkout code and webhook
// routes never import stripe.ts/flutterwave.ts/grey.ts/paystack.ts directly.

import type { PaymentGateway, PaymentProvider } from './types';
import { stripeProvider } from './stripe';
import { flutterwaveProvider } from './flutterwave';
import { greyProvider } from './grey';
import { paystackProvider } from './paystack';

export * from './types';

const providers: Record<PaymentGateway, PaymentProvider> = {
  stripe: stripeProvider,
  flutterwave: flutterwaveProvider,
  grey: greyProvider,
  paystack: paystackProvider,
};

export function getProvider(gateway: PaymentGateway): PaymentProvider {
  return providers[gateway];
}

/**
 * Pick the best gateway for a given currency. Paystack is the practical
 * default for now — it's the account that's actually live, unlike
 * Flutterwave (wasn't accepting onboarding at signup time) and Stripe
 * (requires a US/UK-formed entity, not yet in place). Revisit this as
 * account statuses change.
 */
export function resolveGatewayForCurrency(currency: string): PaymentGateway {
  const upper = currency.toUpperCase();
  if (upper === 'USDC') return 'grey';
  return 'paystack';
}

export function listAvailableGateways(currency: string): PaymentGateway[] {
  const upper = currency.toUpperCase();
  return (Object.keys(providers) as PaymentGateway[]).filter((g) =>
    providers[g].supportedCurrencies().includes(upper),
  );
}
