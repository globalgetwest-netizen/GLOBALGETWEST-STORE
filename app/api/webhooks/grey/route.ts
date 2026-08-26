// app/api/webhooks/grey/route.ts
// See the caveats at the top of lib/payments/grey.ts before relying on this
// in production — the exact payload/signature scheme should be confirmed
// against your Grey Business API credentials and docs.
import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/payments';
import { handleWebhookEvent } from '@/lib/payments/handleWebhookEvent';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  try {
    const event = await getProvider('grey').verifyWebhook(rawBody, req.headers);
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Grey webhook error:', err);
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }
}
