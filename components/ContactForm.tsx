'use client';
// components/ContactForm.tsx
// On-site message form — customers write to us without leaving the site.
import { useState } from 'react';
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/contactTopics';

const field = 'field';
const label = 'field-label';

export function ContactForm({ initialTopic = 'general', initialOrder = '' }: { initialTopic?: ContactTopic; initialOrder?: string }) {
  const [startedAt] = useState(() => Date.now());
  const [form, setForm] = useState({
    name: '', email: '', phone: '', topic: initialTopic as string, orderNumber: initialOrder, message: '', website: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, startedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Your message could not be sent. Please try again.');
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your message could not be sent. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-8 text-center" role="status">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[var(--color-parchment-warm)] border border-[var(--color-border)] flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--color-forest)" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-display text-2xl mb-2">Message sent</h2>
        <p className="text-sm text-[var(--color-ink-soft)] max-w-sm mx-auto">
          Thank you, {form.name.split(' ')[0]}. We&apos;ve emailed you a confirmation at <strong className="text-[var(--color-ink)]">{form.email}</strong> and
          will reply there, usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-[var(--color-border)] bg-white p-6 sm:p-8 space-y-5" noValidate>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="c-name" className={label}>Full name</label>
          <input id="c-name" required autoComplete="name" value={form.name} onChange={set('name')} className={field} />
        </div>
        <div>
          <label htmlFor="c-email" className={label}>Email</label>
          <input id="c-email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} className={field} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="c-phone" className={label}>
            Phone / WhatsApp <span className="font-normal text-[var(--color-ink-muted)]">(optional)</span>
          </label>
          <input id="c-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className={field} />
        </div>
        <div>
          <label htmlFor="c-order" className={label}>
            Order number <span className="font-normal text-[var(--color-ink-muted)]">(optional)</span>
          </label>
          <input id="c-order" placeholder="GGW-123456" value={form.orderNumber} onChange={set('orderNumber')} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="c-topic" className={label}>What is it about?</label>
        <select id="c-topic" value={form.topic} onChange={set('topic')} className={field}>
          {CONTACT_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="c-message" className={label}>Message</label>
        <textarea
          id="c-message" required rows={6} maxLength={5000} value={form.message} onChange={set('message')}
          className="field leading-relaxed"
        />
      </div>

      {/* Hidden from people; bots fill it in and are quietly ignored. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>

      {status === 'error' && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn btn-primary"
        >
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </button>
        <p className="text-xs text-[var(--color-ink-soft)]">We reply by email, usually within one business day.</p>
      </div>
    </form>
  );
}
