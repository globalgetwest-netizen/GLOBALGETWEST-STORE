'use client';
// components/CheckoutFlow.tsx
import { useEffect, useState } from 'react';
import { COUNTRIES, currencyForCountry, localCurrencyForCountry } from '@/lib/countries';
import { formatUsd } from '@/lib/format';
import type { ShippingRateOption } from '@/lib/shipping/types';
import { CONTACTS, contactForCountry } from '@/lib/contact';
import { ContactAgentButton } from '@/components/ContactAgentButton';

interface CartSummary {
  subtotalUsdCents: number;
  totalWeightGrams: number;
}

const GATEWAYS_BY_CURRENCY: Record<string, { id: 'stripe' | 'flutterwave' | 'grey' | 'paystack'; label: string }[]> = {
  // Grey powers this option on the backend, but the customer never needs
  // to see that name — only the payment method itself (USDC/crypto)
  // matters to them. Once a card gateway is approved for USD, add it
  // alongside this, not instead of it.
  USD: [{ id: 'grey', label: 'Pay with USDC (Crypto)' }],
  GHS: [{ id: 'paystack', label: 'Card / Mobile Money (Paystack)' }],
  NGN: [{ id: 'flutterwave', label: 'Card / Mobile Money (Flutterwave)' }],
};

export function CheckoutFlow({ cart }: { cart: CartSummary }) {
  const [step, setStep] = useState<'address' | 'shipping' | 'payment'>('address');
  const [address, setAddress] = useState({
    fullName: '', phone: '', line1: '', line2: '',
    city: '', region: '', postalCode: '', countryCode: 'US',
  });
  const [rates, setRates] = useState<ShippingRateOption[] | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRateOption | null>(null);
  const [gateway, setGateway] = useState<'stripe' | 'flutterwave' | 'grey' | 'paystack'>('paystack');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currency = currencyForCountry(address.countryCode);
  const availableGateways = GATEWAYS_BY_CURRENCY[currency] ?? GATEWAYS_BY_CURRENCY.USD;

  // Force the selected gateway to always be one that's actually valid for
  // the current currency — without this, a stale selection from a previous
  // country/currency could get silently submitted (e.g. 'paystack' still
  // selected after switching to a USD address where only Grey is offered).
  useEffect(() => {
    if (!availableGateways.some((g) => g.id === gateway)) {
      setGateway(availableGateways[0]?.id ?? 'grey');
    }
  }, [currency]);

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
          shippingUsdCents: selectedRate.amountUsdCents,
          shippingCarrier: selectedRate.carrier,
          shippingService: selectedRate.service,
          shippingRateId: selectedRate.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');

      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const total = cart.subtotalUsdCents + (selectedRate?.amountUsdCents ?? 0);

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-6">
        {/* Step 1: Contact + address */}
        <section className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60">
          <h2 className="font-display text-lg mb-4">1. Contact &amp; Delivery Address</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full name" value={address.fullName} onChange={(v) => setAddress({ ...address, fullName: v })} />
            <Field label="Phone" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
            <Field label="Address line 1" value={address.line1} onChange={(v) => setAddress({ ...address, line1: v })} className="sm:col-span-2" />
            <Field label="Address line 2 (optional)" value={address.line2} onChange={(v) => setAddress({ ...address, line2: v })} className="sm:col-span-2" required={false} />
            <Field label="City" value={address.city} onChange={(v) => setAddress({ ...address, city: v })} />
            <Field label="State / Region" value={address.region} onChange={(v) => setAddress({ ...address, region: v })} required={false} />
            <Field label="Postal code" value={address.postalCode} onChange={(v) => setAddress({ ...address, postalCode: v })} required={false} />
            <div>
              <label className="block text-sm font-medium mb-1.5">Country</label>
              <select
                value={address.countryCode}
                onChange={(e) => { setAddress({ ...address, countryCode: e.target.value }); setStep('address'); setRates(null); }}
                className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {address.countryCode && localCurrencyForCountry(address.countryCode) !== currency && (
            <p className="mt-3 text-xs text-[var(--color-ink-soft)] bg-[var(--color-parchment-warm)] rounded-md px-3 py-2">
              Your local currency is {localCurrencyForCountry(address.countryCode)}, but this order will be
              charged in {currency} — that's the currency our payment processor for your region actually
              supports right now. Your card issuer will convert the {currency} amount at checkout.
            </p>
          )}

          {step === 'address' && (
            <button
              onClick={fetchRates}
              disabled={loading || !address.fullName || !address.line1 || !address.city}
              className="focus-ring mt-4 bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-5 py-2.5 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-50"
            >
              {loading ? 'Finding shipping options…' : 'Continue to Shipping'}
            </button>
          )}
        </section>

        {/* Step 2: Shipping */}
        {step !== 'address' && rates && (
          <section className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60">
            <h2 className="font-display text-lg mb-4">2. Delivery Method</h2>
            <div className="space-y-2">
              {rates.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">No live rates returned — check EasyPost carrier setup.</p>}
              {rates.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center justify-between border rounded-md px-4 py-3 cursor-pointer text-sm ${
                    selectedRate?.id === r.id ? 'border-[var(--color-forest)] bg-[var(--color-parchment-warm)]' : 'border-[var(--color-border)]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping-rate"
                      checked={selectedRate?.id === r.id}
                      onChange={() => setSelectedRate(r)}
                    />
                    <span>
                      <span className="font-medium">{r.carrier} — {r.service}</span>
                      {r.estimatedDays && <span className="text-[var(--color-ink-soft)]"> · {r.estimatedDays} days</span>}
                    </span>
                  </span>
                  <span className="font-semibold">{formatUsd(r.amountUsdCents)}</span>
                </label>
              ))}
            </div>
            {rates.length > 0 && (
              <button
                onClick={() => setStep('payment')}
                className="focus-ring mt-4 bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-5 py-2.5 rounded-md hover:bg-[var(--color-forest-dark)]"
              >
                Continue to Payment
              </button>
            )}
          </section>
        )}

        {/* Step 3: Payment */}
        {step === 'payment' && (
          <section className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60">
            <h2 className="font-display text-lg mb-4">3. Payment</h2>
            {availableGateways.length === 0 ? (
              <div className="rounded-md border border-[var(--color-ochre)]/40 bg-[var(--color-ochre)]/10 px-4 py-3 text-sm">
                <p className="font-medium mb-1">Online payment isn't available for your region yet.</p>
                <p className="text-[var(--color-ink-soft)]">
                  We're setting up card payments for international orders. Please contact us at{' '}
                  <a href="mailto:orders@globalgetwest.com" className="underline">orders@globalgetwest.com</a>{' '}
                  to arrange payment for this order — your cart details are saved.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {availableGateways.map((g) => (
                    <label
                      key={g.id}
                      className={`flex items-center gap-3 border rounded-md px-4 py-3 cursor-pointer text-sm ${
                        gateway === g.id ? 'border-[var(--color-forest)] bg-[var(--color-parchment-warm)]' : 'border-[var(--color-border)]'
                      }`}
                    >
                      <input type="radio" name="gateway" checked={gateway === g.id} onChange={() => setGateway(g.id)} />
                      {g.label}
                    </label>
                  ))}
                </div>
                <button
                  onClick={submitOrder}
                  disabled={loading}
                  className="focus-ring mt-4 w-full bg-[var(--color-ochre)] text-[var(--color-forest-dark)] font-semibold px-5 py-3 rounded-md hover:bg-[var(--color-ochre-light)] disabled:opacity-50"
                >
                  {loading ? 'Redirecting to payment…' : `Pay ${formatUsd(total)}`}
                </button>
              </>
            )}

            {/* Manual payment via WhatsApp — an ADDITION alongside the real
                gateways above, not a replacement. Routes to the regional
                contact based on the customer's country. The Asia/Africa
                number is deliberately hidden until the customer clicks —
                never in the page's initial HTML — since it reveals a Ghana
                country code; the US/Europe number is fine to show directly. */}
            <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-ink-soft)] mb-2">
                Prefer bank transfer or Western Union? Message us with your order details and we'll arrange it directly.
              </p>
              <ContactAgentButton
                label={contactForCountry(address.countryCode).label}
                phone={contactForCountry(address.countryCode).phone}
                whatsappNumber={contactForCountry(address.countryCode).whatsapp}
                message={`Hi, I'd like to arrange payment for an order.\n\nName: ${address.fullName}\nCountry: ${COUNTRIES.find((c) => c.code === address.countryCode)?.name ?? address.countryCode}\nOrder total: ${formatUsd(total)}\n\n(Please confirm the items with me.)`}
                revealImmediately={contactForCountry(address.countryCode).label === CONTACTS.usEurope.label}
              />
            </div>
          </section>
        )}

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      </div>

      {/* Order summary */}
      <div className="border border-[var(--color-border)] rounded-lg p-5 h-fit bg-white/60 text-sm">
        <h2 className="font-display text-lg mb-4">Order Summary</h2>
        <div className="flex justify-between mb-2">
          <span className="text-[var(--color-ink-soft)]">Subtotal</span>
          <span>{formatUsd(cart.subtotalUsdCents)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-[var(--color-ink-soft)]">Shipping</span>
          <span>{selectedRate ? formatUsd(selectedRate.amountUsdCents) : '—'}</span>
        </div>
        <div className="flex justify-between font-semibold text-base border-t border-[var(--color-border)] pt-2 mt-2">
          <span>Total</span>
          <span>{formatUsd(total)}</span>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, className = '', required = true,
}: {
  label: string; value: string; onChange: (v: string) => void; className?: string; required?: boolean;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
      />
    </div>
  );
}
