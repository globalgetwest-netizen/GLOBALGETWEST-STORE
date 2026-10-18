'use client';
// components/LocalPrice.tsx
// Shows a visitor in Africa a guide price in their own currency under the
// USD price ("≈ KSh 3,240"). The root layout works out the visitor's
// currency once and shares it through LocalPriceProvider; outside Africa
// (or without a rate) this renders nothing.
import { createContext, useContext } from 'react';
import type { LocalPricing } from '@/lib/fx';
import { formatApproxLocal } from '@/lib/format';

const LocalPriceContext = createContext<LocalPricing | null>(null);

export function LocalPriceProvider({ value, children }: { value: LocalPricing | null; children: React.ReactNode }) {
  return <LocalPriceContext.Provider value={value}>{children}</LocalPriceContext.Provider>;
}

export function LocalPrice({ usdCents, className = '' }: { usdCents: number; className?: string }) {
  const local = useContext(LocalPriceContext);
  if (!local) return null;
  return (
    <span className={`text-[var(--color-ink-soft)] tabular-nums ${className}`} title={`Guide price in ${local.currency} at today's rate`}>
      ≈ {formatApproxLocal(usdCents, local)}
    </span>
  );
}
