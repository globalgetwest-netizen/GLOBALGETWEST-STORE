// app/api/checkout/route.ts
// Called by the storefront once a cart is ready to pay. Creates the order
// row in 'pending_payment' status, then creates a hosted checkout session
// with the resolved gateway and returns the redirect URL.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient, supabaseServiceRole } from '@/lib/supabase/server';
import { generateOrderNumber, logOrderEvent } from '@/lib/orders';
import { getProvider, resolveGatewayForCurrency, PaymentError } from '@/lib/payments';

export async function POST(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const {
    shippingAddressId, billingAddressId, currency, gateway: requestedGateway,
    shippingUsdCents, shippingCarrier, shippingService, shippingRateId,
  } = body as {
    shippingAddressId: string;
    billingAddressId: string;
    currency: string;
    gateway?: 'stripe' | 'flutterwave' | 'grey' | 'paystack';
    shippingUsdCents: number;
    shippingCarrier?: string;
    shippingService?: string;
    shippingRateId?: string;
  };

  // 1. Load the customer's cart with variant + product data (RLS scopes this to the user)
  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select(`
      quantity,
      product_variants (
        id, sku, name, price_usd_cents,
        products ( name )
      )
    `)
    .eq('profile_id', user.id);

  if (cartError) {
    return NextResponse.json({ error: cartError.message }, { status: 500 });
  }
  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  // 2. Compute totals in USD cents (source of truth), then convert for display/charge currency
  const subtotalUsdCents = cartItems.reduce((sum, item: any) => {
    return sum + item.product_variants.price_usd_cents * item.quantity;
  }, 0);

  const shippingCents = shippingUsdCents ?? 0; // customer's chosen rate from /api/shipping-rates
  const taxUsdCents = 0;      // TODO: wire up tax rules per region
  const totalUsdCents = subtotalUsdCents + shippingCents + taxUsdCents;

  // 3. Convert to charge currency using current fx_rates (service role — fx_rates
  //    is public-readable but this keeps it consistent with server-side math)
  const svc = supabaseServiceRole();
  let amountMinorUnits = totalUsdCents;

  if (currency !== 'USD') {
    const { data: fx } = await svc
      .from('fx_rates')
      .select('rate')
      .eq('base_currency', 'USD')
      .eq('quote_currency', currency)
      .order('effective_at', { ascending: false })
      .limit(1)
      .single();

    if (!fx) {
      return NextResponse.json({ error: `No FX rate available for USD → ${currency}` }, { status: 400 });
    }
    amountMinorUnits = Math.round(totalUsdCents * Number(fx.rate));
  }

  // 4. Create the order (pending_payment) + order_items as one transaction via RPC
  //    would be ideal — kept as sequential inserts here for clarity.
  const orderNumber = generateOrderNumber();

  // Denormalize shipping country onto the order for fast staff country-scoping
  // (see migration 006) — avoids a join on every staff queue/order-list query.
  const { data: shippingAddr } = await supabase
    .from('addresses')
    .select('country_code')
    .eq('id', shippingAddressId)
    .single();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: user.id,
      status: 'pending_payment',
      currency,
      subtotal_usd_cents: subtotalUsdCents,
      shipping_usd_cents: shippingCents,
      tax_usd_cents: taxUsdCents,
      total_usd_cents: totalUsdCents,
      shipping_address_id: shippingAddressId,
      billing_address_id: billingAddressId,
      shipping_carrier: shippingCarrier ?? null,
      shipping_service: shippingService ?? null,
      shipping_rate_id: shippingRateId ?? null,
      shipping_country_code: shippingAddr?.country_code ?? null,
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? 'Failed to create order' }, { status: 500 });
  }

  const orderItemsPayload = cartItems.map((item: any) => ({
    order_id: order.id,
    variant_id: item.product_variants.id,
    product_name_snapshot: item.product_variants.products.name,
    variant_name_snapshot: item.product_variants.name,
    unit_price_usd_cents: item.product_variants.price_usd_cents,
    quantity: item.quantity,
    line_total_usd_cents: item.product_variants.price_usd_cents * item.quantity,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  await logOrderEvent(order.id, 'created', `Order placed via checkout, currency ${currency}`, user.id);

  // 5. Create the hosted checkout session with the resolved (or requested) gateway
  const gateway = requestedGateway ?? resolveGatewayForCurrency(currency);
  const provider = getProvider(gateway);

  // Defense in depth: never let a client-supplied gateway charge in a
  // currency it doesn't actually support (e.g. Paystack + USD, unconfirmed
  // on this account — see supportedCurrencies() in lib/payments/paystack.ts).
  // The frontend already prevents this via GATEWAYS_BY_CURRENCY, but a
  // request could bypass that — this check is what actually stops it.
  if (!provider.supportedCurrencies().includes(currency.toUpperCase())) {
    return NextResponse.json(
      { error: `${gateway} does not support ${currency} on this account` },
      { status: 400 },
    );
  }

  try {
    const session = await provider.createCheckoutSession({
      orderId: order.id,
      orderNumber: order.order_number,
      currency,
      amountMinorUnits,
      customerEmail: user.email!,
      customerName: user.user_metadata?.full_name ?? user.email!,
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/orders/${order.id}/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?cancelled=1`,
    });

    // Record the payment attempt so the webhook has something to match against
    await svc.from('payments').insert({
      order_id: order.id,
      gateway: session.gateway,
      gateway_reference: session.gatewayReference,
      status: 'initiated',
      currency,
      amount_minor_units: amountMinorUnits,
      amount_usd_cents: totalUsdCents,
    });

    // Clear the cart now that it's been converted into an order
    await supabase.from('cart_items').delete().eq('profile_id', user.id);

    return NextResponse.json({ redirectUrl: session.redirectUrl, orderId: order.id });
  } catch (err) {
    const message = err instanceof PaymentError ? err.message : 'Payment initiation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
