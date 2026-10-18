// app/api/contact/route.ts
// The on-site contact form. Delivers the message to support@globalgetwest.com
// (forwarded to the team's inbox) with Reply set to the customer, and sends
// the customer a short confirmation. Uses Brevo (lib/email.ts).
//
// Spam protection without CAPTCHAs: a hidden "website" field that people
// never fill in, a minimum time on the page, and strict length limits.
import { NextRequest, NextResponse } from 'next/server';
import { emailEnabled, esc, sendEmail } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/contact';
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/contactTopics';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_FILL_MS = 3000;

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Please fill in the form and try again.' }, { status: 400 });

  // Bots: pretend success so they don't retry, but send nothing.
  const startedAt = Number(body.startedAt);
  if (clean(body.website, 200) || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(body.name, 100);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  const orderNumber = clean(body.orderNumber, 30).toUpperCase();
  const message = clean(body.message, 5000);
  const topic = (CONTACT_TOPICS.some((t) => t.id === body.topic) ? body.topic : 'general') as ContactTopic;
  const topicLabel = CONTACT_TOPICS.find((t) => t.id === topic)!.label;

  if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email address so we can reply.' }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: 'Please write a little more about how we can help.' }, { status: 400 });

  if (!emailEnabled()) {
    return NextResponse.json(
      { error: 'Our message form is temporarily unavailable. Please reach us on WhatsApp using the numbers below.' },
      { status: 503 },
    );
  }

  const subject = `${topicLabel}${orderNumber ? ` · ${orderNumber}` : ''} — ${name}`;
  const details: [string, string][] = [
    ['Name', name],
    ['Email', email],
    ...(phone ? [['Phone / WhatsApp', phone] as [string, string]] : []),
    ['Topic', topicLabel],
    ...(orderNumber ? [['Order number', orderNumber] as [string, string]] : []),
  ];

  const toTeam = await sendEmail({
    to: { email: SUPPORT_EMAIL, name: 'GLOBALGETWEST Support' },
    replyTo: { email, name },
    subject: `[Website] ${subject}`,
    html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#111;line-height:1.6">
<p style="margin:0 0 12px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#5F5F5F">New message from the website contact form</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 16px">${details
      .map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:#5F5F5F">${esc(k)}</td><td style="padding:3px 0"><strong>${esc(v)}</strong></td></tr>`)
      .join('')}</table>
<div style="padding:14px 16px;border:1px solid #E8E8E8;border-radius:6px;white-space:pre-wrap">${esc(message)}</div>
<p style="margin:16px 0 0;font-size:12px;color:#5F5F5F">Press Reply to answer ${esc(name)} directly at ${esc(email)}.</p>
</div>`,
    text: `New message from the website contact form\n\n${details.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${message}\n\n— Press Reply to answer ${name} at ${email}.`,
  });

  if (!toTeam) {
    return NextResponse.json(
      { error: 'Your message could not be sent just now. Please try again in a minute, or reach us on WhatsApp.' },
      { status: 502 },
    );
  }

  // Confirmation to the customer. Best effort: their message is already with us.
  const first = name.split(' ')[0];
  await sendEmail({
    to: { email, name },
    subject: 'We received your message — GLOBALGETWEST',
    html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:520px">
<p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;letter-spacing:1px;color:#0F2A45;font-weight:bold;margin:0 0 16px;padding-bottom:12px;border-bottom:3px solid #C08A34">GLOBALGETWEST</p>
<p>Hello ${esc(first)},</p>
<p>Thank you for contacting us. We've received your message about <strong>${esc(topicLabel.toLowerCase())}</strong>${orderNumber ? ` (order ${esc(orderNumber)})` : ''} and will reply to this email address, usually within one business day.</p>
<p style="color:#5F5F5F;font-size:13px">For anything urgent, our regional agents are also on WhatsApp — the numbers are at the bottom of every page on globalgetwest.com.</p>
<p style="margin-top:24px">— The GLOBALGETWEST team</p>
</div>`,
    text: `Hello ${first},\n\nThank you for contacting us. We've received your message about ${topicLabel.toLowerCase()}${orderNumber ? ` (order ${orderNumber})` : ''} and will reply to this email address, usually within one business day.\n\nFor anything urgent, our regional agents are also on WhatsApp — the numbers are at the bottom of every page on globalgetwest.com.\n\n— The GLOBALGETWEST team`,
  });

  return NextResponse.json({ ok: true });
}
