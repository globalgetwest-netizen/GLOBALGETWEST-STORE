'use client';
// components/CheckoutFlow.tsx
import { useState } from 'react';
import { COUNTRIES, currencyForCountry, localCurrencyForCountry } from '@/lib/countries';
import { formatMoney, formatUsd } from '@/lib/format';
import type { ShippingRateOption } from '@/lib/shipping/types';
import { CONTACTS, SUPPORT_EMAIL, contactForCountry } from '@/lib/contact';
import { ContactAgentButton } from '@/components/ContactAgentButton';

export interface CheckoutLineItem {
  id: string;
  name: string;
  variant: string;
  quantity: number;
  imageUrl: string | null;
  lineTotalUsdCents: number;
}

interface CartSummary {
  subtotalUsdCents: number;
  totalWeightGrams: number;
  items: CheckoutLineItem[];
}

type GatewayId = 'stripe' | 'flutterwave' | 'grey' | 'paystack';

// Customers see the payment method, never the processor's name. Each option
// only appears once its gateway's key is configured (see configuredGateways
// in lib/payments), so a gateway approved later shows up with no code change.
const GATEWAYS_BY_CURRENCY: Record<string, { id: GatewayId; label: string; detail: string }[]> = {
  USD: [
    { id: 'stripe', label: 'Card, Apple Pay or Google Pay', detail: 'Visa, Mastercard and digital wallets' },
    { id: 'flutterwave', label: 'Card', detail: 'Visa and Mastercard' },
    { id: 'grey', label: 'USDC (crypto)', detail: 'Pay from a crypto wallet' },
  ],
  GHS: [{ id: 'paystack', label: 'Card or mobile money', detail: 'Visa, Mastercard, MTN MoMo, Telecel Cash, AirtelTigo Money' }],
  NGN: [{ id: 'flutterwave', label: 'Card, bank transfer or USSD', detail: 'Visa, Mastercard and Nigerian banks' }],
};

export function CheckoutFlow({
  cart, fxRates, isGuest = false, enabledGateways,
}: { cart: CartSummary; fxRates: Record<string, number>; isGuest?: boolean; enabledGateways: GatewayId[] }) {
  const [step, setStep] = useState<'address' | 'shipping' | 'payment'>('address');
  const [email, setEmail] = useState('');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const [address, setAddress] = useState({
    fullName: '', phone: '', line1: '', line2: '',
    city: '', region: '', postalCode: '', countryCode: 'US',
  });
  const [rates, setRates] = useState<ShippingRateOption[] | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRateOption | null>(null);
  const [chosenGateway, setGateway] = useState<GatewayId | 'agent' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currency = currencyForCountry(address.countryCode);
  const availableGateways = (GATEWAYS_BY_CURRENCY[currency] ?? GATEWAYS_BY_CURRENCY.USD)
    .filter((g) => enabledGateways.includes(g.id));

  // Online methods first, then agent-assisted bank transfer / Western Union,
  // which is always available so every country can complete an order.
  const contact = contactForCountry(address.countryCode);
  const paymentOptions: { id: GatewayId | 'agent'; label: string; detail: string }[] = [
    ...availableGateways,
    {
      id: 'agent',
      label: 'Bank transfer or Western Union',
      detail: `Place your order now. Your ${contact.label} agent sends payment details on WhatsApp.`,
    },
  ];

  // Always submit an option that's valid for the current country — a stale
  // choice from a previous country falls back to the first valid option.
  const gateway = paymentOptions.some((g) => g.id === chosenGateway)
    ? chosenGateway!
    : paymentOptions[0].id;
  const isAgent = gateway === 'agent';

  async function fetchRates() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/shipping-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: address, totalWeightGrams: cart.totalWeightGrams }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not fetch shipping rates');
      setRates(data.rates);
      setSelectedRate(data.rates[0] ?? null);
      setStep('shipping');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function submitOrder() {
    if (!selectedRate) {
      setError('Select a shipping option first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // First, save the address on file, then create the order + checkout session
      const addrRes = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(address),
      });
      const addrData = await addrRes.json();
      if (!addrRes.ok) throw new Error(addrData.error ?? 'Could not save address');

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddressId: addrData.id,
          billingAddressId: addrData.id,
          currency,
          gateway,
          shippingCarrier: selectedRate.carrier,
          shippingService: selectedRate.service,
          shippingRateId: selectedRate.id,
          ...(isGuest ? { email } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');

      window.location.assign(data.redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const total = cart.subtotalUsdCents + (selectedRate?.amountUsdCents ?? 0);
  // What the gateway will actually charge — same conversion and rounding as
  // /api/checkout, so a Ghana customer sees GH₵ on the button, not $.
  const chargeTotal = currency === 'USD'
    ? total
    : fxRates[currency] ? Math.round(total * fxRates[currency]) : null;
  const totalLabel = currency === 'USD' || chargeTotal === null
    ? formatUsd(total)
    : formatMoney(chargeTotal, currency);

  const country = COUNTRIES.find((c) => c.code === address.countryCode)?.name ?? address.countryCode;
  const setField = (key: keyof typeof address) => (v: string) => {
    setAddress({ ...address, [key]: v });
    if (step !== 'address') { setStep('address'); setRates(null); setSelectedRate(null); }
  };

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-10 items-start">
      <div className="space-y-4">
        {/* Step 1: Contact + address */}
        <Section number={1} title="Contact and delivery" done={step !== 'address'} onEdit={() => setStep('address')}
          summary={
            <>
              {isGuest && <>{email}<br /></>}
              {address.fullName} · {address.phone}<br />
              {address.line1}{address.line2 && `, ${address.line2}`}, {address.city}{address.region && `, ${address.region}`} {address.postalCode}<br />
              {country}
            </>
          }
        >
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3.5">
            {isGuest && (
              <Field label="Email" hint="For your receipt and delivery updates" type="email" autoComplete="email"
                value={email} onChange={setEmail} className="sm:col-span-2" />
            )}
            <Field label="Full name" autoComplete="name" value={address.fullName} onChange={setField('fullName')} />
            <Field label="Phone" type="tel" autoComplete="tel" value={address.phone} onChange={setField('phone')} />
            <Field label="Address" autoComplete="address-line1" value={address.line1} onChange={setField('line1')} className="sm:col-span-2" />
            <Field label="Apartment, suite, etc." optional autoComplete="address-line2" value={address.line2} onChange={setField('line2')} className="sm:col-span-2" />
            <Field label="City" autoComplete="address-level2" value={address.city} onChange={setField('city')} />
            <Field label="State / region" optional autoComplete="address-level1" value={address.region} onChange={setField('region')} />
            <Field label="Postal code" optional autoComplete="postal-code" value={address.postalCode} onChange={setField('postalCode')} />
            <div>
              <label htmlFor="checkout-country" className="block text-[13px] font-medium mb-1.5">Country</label>
              <select
                id="checkout-country"
                autoComplete="country"
                value={address.countryCode}
                onChange={(e) => setField('countryCode')(e.target.value)}
                className="focus-ring w-full h-11 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {localCurrencyForCountry(address.countryCode) !== currency && (
            <p className="mt-4 text-xs text-[var(--color-ink-soft)]">
              Your order is charged in {currency}. Your bank converts it to{' '}
              {localCurrencyForCountry(address.countryCode)} automatically.
            </p>
          )}

          <button
            onClick={fetchRates}
            disabled={loading || !address.fullName || !address.phone || !address.line1 || !address.city || (isGuest && !emailValid)}
            className="focus-ring mt-6 w-full sm:w-auto bg-[var(--color-charcoal)] text-white font-semibold px-7 py-3 rounded hover:bg-black transition-colors disabled:opacity-40"
          >
            {loading && step === 'address' ? 'Finding delivery options…' : 'Continue to delivery'}
          </button>
        </Section>

        {/* Step 2: Delivery */}
        <Section number={2} title="Delivery" locked={step === 'address'} done={step === 'payment'} onEdit={() => setStep('shipping')}
          summary={selectedRate && (
            <>
              {selectedRate.carrier} · {selectedRate.service}
              {selectedRate.estimatedDays && <> · about {selectedRate.estimatedDays} days</>}
              {' · '}{selectedRate.amountUsdCents === 0 ? 'Free' : formatUsd(selectedRate.amountUsdCents)}
            </>
          )}
        >
          {rates && rates.length === 0 && (
            <p className="text-sm text-[var(--color-ink-soft)]">
              We couldn&apos;t calculate delivery to this address. Message us at the payment step and we&apos;ll arrange it.
            </p>
          )}
          <div className="space-y-2.5">
            {(rates ?? []).map((r) => (
              <Choice key={r.id} name="shipping-rate" checked={selectedRate?.id === r.id} onChange={() => setSelectedRate(r)}
                title={`${r.carrier} · ${r.service}`}
                detail={r.estimatedDays ? `Arrives in about ${r.estimatedDays} days` : undefined}
                aside={r.amountUsdCents === 0 ? 'Free' : formatUsd(r.amountUsdCents)}
              />
            ))}
          </div>
          {rates && rates.length > 0 && (
            <button
              onClick={() => setStep('payment')}
              className="focus-ring mt-6 w-full sm:w-auto bg-[var(--color-charcoal)] text-white font-semibold px-7 py-3 rounded hover:bg-black transition-colors"
            >
              Continue to payment
            </button>
          )}
        </Section>

        {/* Step 3: Payment */}
        <Section number={3} title="Payment" locked={step !== 'payment'}>
          <div className="space-y-2.5">
            {paymentOptions.map((g) => (
              <Choice key={g.id} name="gateway" checked={gateway === g.id} onChange={() => setGateway(g.id)}
                title={g.label} detail={g.detail} />
            ))}
          </div>

          {isAgent && (
            <ol className="mt-4 rounded-md bg-[var(--color-parchment-warm)] border border-[var(--color-border)] px-5 py-4 text-sm space-y-1.5 list-decimal list-inside text-[var(--color-ink-soft)]">
              <li><span className="text-[var(--color-ink)]">Place your order</span> — we reserve your items and give you an order number.</li>
              <li><span className="text-[var(--color-ink)]">Your agent messages you</span> on WhatsApp with bank or Western Union details.</li>
              <li><span className="text-[var(--color-ink)]">We ship</span> as soon as your payment is confirmed.</li>
            </ol>
          )}

          <button
            onClick={submitOrder}
            disabled={loading}
            className="focus-ring mt-6 w-full bg-[var(--color-charcoal)] text-white font-semibold px-6 py-4 rounded hover:bg-black transition-colors disabled:opacity-50"
          >
            {loading
              ? (isAgent ? 'Placing your order…' : 'Taking you to secure payment…')
              : (isAgent ? `Place order · ${totalLabel}` : `Pay ${totalLabel}`)}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            {isAgent
              ? 'No payment is taken now. Your details stay private.'
              : 'You\'ll complete payment on a secure, encrypted page.'}
          </p>

          {/* Questions before ordering — routes to the regional agent. The
              Africa number is deliberately hidden until the customer clicks
              (never in the page's initial HTML); others show directly. */}
          <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-ink-soft)] mb-3">
              Questions before you order? Your agent is a message away. You can also email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
            </p>
            <ContactAgentButton
              label={contact.label}
              phone={contact.phone}
              whatsappNumber={contact.whatsapp}
              message={`Hi, I'd like to arrange payment for an order.\n\nName: ${address.fullName}\nCountry: ${country}\nOrder total: ${totalLabel}\n\n(Please confirm the items with me.)`}
              revealImmediately={contact.label !== CONTACTS.africa.label}
            />
          </div>
        </Section>

        {error && (
          <p role="alert" className="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </div>

      {/* Order summary */}
      <aside className="lg:sticky lg:top-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment-warm)] p-6 text-sm">
        <h2 className="font-display text-xl mb-5">Order summary</h2>
        <ul className="space-y-4 mb-5">
          {cart.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <div className="relative w-14 h-14 shrink-0 rounded-md bg-white border border-[var(--color-border)] overflow-hidden">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute -top-0 -right-0 min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-bl-md bg-[var(--color-charcoal)] text-white text-[10px] font-semibold">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)] truncate">{item.variant}</p>
              </div>
              <span className="whitespace-nowrap">{formatUsd(item.lineTotalUsdCents)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
          <div className="flex justify-between">
            <span className="text-[var(--color-ink-soft)]">Subtotal</span>
            <span>{formatUsd(cart.subtotalUsdCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-ink-soft)]">Delivery</span>
            <span className={selectedRate ? '' : 'text-[var(--color-ink-soft)]'}>
              {selectedRate ? (selectedRate.amountUsdCents === 0 ? 'Free' : formatUsd(selectedRate.amountUsdCents)) : 'Next step'}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-baseline border-t border-[var(--color-border)] mt-4 pt-4">
          <span className="font-medium">Total</span>
          <span className="font-display text-2xl">{currency === 'USD' || chargeTotal === null ? formatUsd(total) : formatMoney(chargeTotal, currency)}</span>
        </div>
        {currency !== 'USD' && chargeTotal !== null && (
          <p className="mt-1 text-right text-xs text-[var(--color-ink-soft)]">≈ {formatUsd(total)}</p>
        )}
      </aside>
    </div>
  );
}

function Section({
  number, title, children, done = false, locked = false, onEdit, summary,
}: {
  number: number; title: string; children: React.ReactNode;
  done?: boolean; locked?: boolean; onEdit?: () => void; summary?: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border bg-white p-6 transition-colors ${locked ? 'border-[var(--color-border)]' : 'border-[var(--color-border)] shadow-[0_1px_2px_rgba(0,0,0,0.03)]'}`}>
      <div className="flex items-center gap-3">
        <span
          className={`w-7 h-7 shrink-0 rounded-full inline-flex items-center justify-center text-xs font-semibold ${
            done ? 'bg-[var(--color-forest)] text-white' : locked ? 'bg-[var(--color-parchment-warm)] text-[var(--color-ink-muted)] border border-[var(--color-border)]' : 'bg-[var(--color-charcoal)] text-white'
          }`}
          aria-hidden="true"
        >
          {done ? '✓' : number}
        </span>
        <h2 className={`font-display text-xl flex-1 ${locked ? 'text-[var(--color-ink-muted)]' : ''}`}>{title}</h2>
        {done && onEdit && (
          <button onClick={onEdit} className="focus-ring text-sm text-[var(--color-forest)] font-medium hover:underline">
            Edit
          </button>
        )}
      </div>
      {done && summary && <p className="mt-3 ml-10 text-sm text-[var(--color-ink-soft)] leading-relaxed">{summary}</p>}
      {!done && !locked && <div className="mt-5">{children}</div>}
    </section>
  );
}

function Choice({
  name, checked, onChange, title, detail, aside,
}: {
  name: string; checked: boolean; onChange: () => void; title: string; detail?: string; aside?: string;
}) {
  return (
    <label
      className={`flex items-center gap-3.5 rounded-md border px-4 py-3.5 cursor-pointer text-sm transition-colors ${
        checked ? 'border-[var(--color-charcoal)] bg-[var(--color-parchment-warm)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink-muted)]'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="accent-[var(--color-charcoal)] w-4 h-4" />
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        {detail && <span className="block text-xs text-[var(--color-ink-soft)] mt-0.5">{detail}</span>}
      </span>
      {aside && <span className="font-semibold">{aside}</span>}
    </label>
  );
}

function Field({
  label, value, onChange, className = '', optional = false, type = 'text', autoComplete, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; className?: string;
  optional?: boolean; type?: string; autoComplete?: string; hint?: string;
}) {
  const id = `checkout-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium mb-1.5">
        {label}
        {optional && <span className="font-normal text-[var(--color-ink-muted)]"> (optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={!optional}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="focus-ring w-full h-11 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm transition-colors hover:border-[var(--color-ink-muted)]"
      />
      {hint && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{hint}</p>}
    </div>
  );
}
