// app/api/checkout/route.ts
// Called by the storefront once a cart is ready to pay. Creates the order
// row in 'pending_payment' status, then creates a hosted checkout session
// with the resolved gateway and returns the redirect URL.

import { NextRequest, NextResponse, after } from 'next/server';
import { supabaseServerClient, supabaseServiceRole } from '@/lib/supabase/server';
import { generateOrderNumber, logOrderEvent } from '@/lib/orders';
import { configuredGateways, getProvider, resolveGatewayForCurrency, PaymentError } from '@/lib/payments';
import { quoteShippingForCart, findSelectedRate } from '@/lib/shipping/quote';
import { asCartLines } from '@/lib/cartTypes';
import { isManualMethod, METHOD_LABEL, type ManualMethod } from '@/lib/paymentMethods';
import { sendOrderEmail } from '@/lib/orderEmails';

export async function POST(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const {
    shippingAddressId, billingAddressId, currency, gateway: requestedGateway,
    shippingCarrier, shippingService, shippingRateId, email: guestEmail,
  } = body as {
    shippingAddressId: string;
    billingAddressId: string;
    currency: string;
    // 'bank_transfer' / 'western_union' = no online payment: the order is
    // placed and the customer's regional agent arranges payment on WhatsApp.
    // ('agent' is the older name for bank transfer.)
    gateway?: 'stripe' | 'flutterwave' | 'grey' | 'paystack' | 'agent' | ManualMethod;
    shippingCarrier?: string;
    shippingService?: string;
    shippingRateId?: string;
    email?: string;
  };

  // Guests (no account) type their email at checkout; registered customers
  // use the email on their account. Gateways need one for the receipt.
  const isGuest = !!user.is_anonymous;
  const customerEmail = isGuest ? guestEmail?.trim().toLowerCase() : user.email;
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const manualMethod: ManualMethod | null = requestedGateway === 'agent'
    ? 'bank_transfer'
    : isManualMethod(requestedGateway) ? requestedGateway : null;
  const isAgentPayment = manualMethod !== null;
  const gateway = isAgentPayment
    ? null
    : ((requestedGateway as 'stripe' | 'flutterwave' | 'grey' | 'paystack' | undefined) ?? resolveGatewayForCurrency(currency));
  if (gateway) {
    if (!configuredGateways().includes(gateway)) {
      return NextResponse.json(
        { error: "That payment method isn't available right now. Choose bank transfer and your agent will help." },
        { status: 400 },
      );
    }
    // Defense in depth: never let a client-supplied gateway charge in a
    // currency it doesn't support (e.g. Paystack + USD, unconfirmed on this
    // account — see supportedCurrencies() in lib/payments/paystack.ts).
    if (!getProvider(gateway).supportedCurrencies().includes(currency.toUpperCase())) {
      return NextResponse.json(
        { error: `${gateway} does not support ${currency} on this account` },
        { status: 400 },
      );
    }
  }

  // 1. Load the customer's cart with variant + product data (RLS scopes this to the user)
  const { data: cartRows, error: cartError } = await supabase
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
  const cartItems = asCartLines(cartRows);
  if (cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  // 2. Compute totals in USD cents (source of truth), then convert for display/charge currency
  const subtotalUsdCents = cartItems.reduce((sum, item) => {
    return sum + item.product_variants.price_usd_cents * item.quantity;
  }, 0);

  // Re-price the customer's chosen shipping option server-side — any
  // shipping amount in the request body is ignored. RLS scopes the address
  // lookup to this user, so another customer's address id won't resolve.
  const { data: shippingAddr } = await supabase
    .from('addresses')
    .select('full_name, phone, line1, line2, city, region, postal_code, country_code')
    .eq('id', shippingAddressId)
    .single();

  if (!shippingAddr) {
    return NextResponse.json({ error: 'Shipping address not found' }, { status: 400 });
  }

  const { rates } = await quoteShippingForCart(supabase, user.id, {
    fullName: shippingAddr.full_name,
    phone: shippingAddr.phone,
    line1: shippingAddr.line1,
    line2: shippingAddr.line2 ?? undefined,
    city: shippingAddr.city,
    region: shippingAddr.region ?? undefined,
    postalCode: shippingAddr.postal_code ?? undefined,
    countryCode: shippingAddr.country_code,
  });
  const shippingRate = findSelectedRate(rates, {
    id: shippingRateId, carrier: shippingCarrier, service: shippingService,
  });

  if (!shippingRate) {
    return NextResponse.json(
      { error: 'That shipping option is no longer available — please go back and choose again' },
      { status: 400 },
    );
  }

  const shippingCents = shippingRate.amountUsdCents;
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
      shipping_carrier: shippingRate.carrier,
      shipping_service: shippingRate.service,
      shipping_rate_id: shippingRate.id,
      // Denormalized for fast staff country-scoping (see migration 006).
      shipping_country_code: shippingAddr.country_code,
      // Only set for guests, so registered checkout keeps working even
      // before migration 014 has been run.
      ...(isGuest ? { contact_email: customerEmail } : {}),
      ...(manualMethod ? { payment_method: manualMethod } : {}),
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? 'Failed to create order' }, { status: 500 });
  }

  const orderItemsPayload = cartItems.map((item) => ({
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

  await logOrderEvent(
    order.id, 'created',
    `Order placed via ${isGuest ? 'guest ' : ''}checkout, currency ${currency}`
      + (manualMethod ? ` — awaiting ${METHOD_LABEL[manualMethod]} arranged by regional agent` : ''),
    user.id,
  );

  // Give the guest's profile a name and phone so staff/admin screens show
  // who ordered (profiles.email stays empty — it's unique per account).
  if (isGuest) {
    await svc.from('profiles')
      .update({ full_name: shippingAddr.full_name, phone: shippingAddr.phone })
      .eq('id', user.id);
  }

  // Agent-assisted payment: the order is placed now (so it shows in admin and
  // the customer has an order number), and payment is arranged on WhatsApp.
  if (!gateway) {
    await supabase.from('cart_items').delete().eq('profile_id', user.id);
    after(() => sendOrderEmail(order.id, 'placed'));
    return NextResponse.json({ redirectUrl: `/orders/${order.id}/success`, orderId: order.id });
  }

  // 5. Create the hosted checkout session with the validated gateway
  const provider = getProvider(gateway);

  try {
    const session = await provider.createCheckoutSession({
      orderId: order.id,
      orderNumber: order.order_number,
      currency,
      amountMinorUnits,
      customerEmail,
      customerName: user.user_metadata?.full_name ?? shippingAddr.full_name,
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
