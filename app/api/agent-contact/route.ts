// app/api/agent-contact/route.ts
// Returns the Africa agent's WhatsApp number when a visitor clicks "Chat
// with Agent — Africa", so the number is never part of a page's HTML or
// the site's JavaScript bundle.
import { NextResponse } from 'next/server';
import { AFRICA_AGENT_NUMBER } from '@/lib/contactPrivate';

export async function GET() {
  return NextResponse.json(AFRICA_AGENT_NUMBER, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
