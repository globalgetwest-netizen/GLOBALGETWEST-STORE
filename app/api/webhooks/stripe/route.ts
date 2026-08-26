// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/payments';
import { handleWebhookEvent } from '@/lib/payments/handleWebhookEvent';

// Stripe requires the raw body for signature verification — disable
// Next.js's automatic body parsing behavior by reading text() directly
// (App Router route handlers already give you the raw stream this way).
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  try {
    const event = await getProvider('stripe').verifyWebhook(rawBody, req.headers);
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }
}
