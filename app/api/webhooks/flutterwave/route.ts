// app/api/webhooks/flutterwave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/payments';
import { handleWebhookEvent } from '@/lib/payments/handleWebhookEvent';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  try {
    const event = await getProvider('flutterwave').verifyWebhook(rawBody, req.headers);
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Flutterwave webhook error:', err);
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }
}
