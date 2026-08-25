"use client"
import { useCurrency } from './CurrencyProvider';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'INR', 'JPY', 'CAD', 'AUD'];

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  return (
    <select
      aria-label="Display currency"
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

