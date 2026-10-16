// app/api/agent-contact/route.ts
// Returns the Africa agents' WhatsApp numbers when a visitor clicks "Chat
// with Agent — Africa" (or a WhatsApp button on an African customer's order
// page), so the numbers are never part of a page's HTML or the site's
// JavaScript bundle.
import { NextResponse } from 'next/server';
import { AFRICA_AGENT_NUMBERS } from '@/lib/contactPrivate';

export async function GET() {
  return NextResponse.json({ agents: AFRICA_AGENT_NUMBERS }, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
