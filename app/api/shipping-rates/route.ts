// app/api/shipping-rates/route.ts
// Called from the checkout page once the customer has entered their address,
// so they can pick a carrier/service before paying.
import { NextRequest, NextResponse } from 'next/server';
import { easypostProvider } from '@/lib/shipping/easypost';
import type { ShippingAddressInput, ShippingRateOption } from '@/lib/shipping/types';

const WAREHOUSE_ORIGIN: ShippingAddressInput = {
  fullName: 'GLOBALGETWEST Fulfilment',
  phone: process.env.WAREHOUSE_PHONE ?? '',
  line1: process.env.WAREHOUSE_ADDRESS_LINE1 ?? '',
  city: process.env.WAREHOUSE_CITY ?? '',
  region: process.env.WAREHOUSE_REGION,
  postalCode: process.env.WAREHOUSE_POSTAL_CODE,
  countryCode: process.env.WAREHOUSE_COUNTRY_CODE ?? 'US',
};

// Temporary fallback so checkout can complete before EasyPost is configured
// (EASYPOST_API_KEY not set yet). This is a flat estimate, not a real
// carrier quote — replace by setting EASYPOST_API_KEY once that account
// exists; this fallback only activates when the real call fails or the key
// is missing, so switching to live rates requires no code change.
function flatRateFallback(destination: ShippingAddressInput): ShippingRateOption[] {
  const domestic = destination.countryCode === (process.env.WAREHOUSE_COUNTRY_CODE ?? 'US');
  return [
    {
      id: 'flat-rate-fallback',
      carrier: 'Standard Shipping',
      service: domestic ? 'Domestic' : 'International',
      amountUsdCents: domestic ? 1500 : 4500,
      estimatedDays: domestic ? 7 : 14,
    },
  ];
}

export async function POST(req: NextRequest) {
  const { destination, totalWeightGrams } = await req.json() as {
    destination: ShippingAddressInput;
    totalWeightGrams: number;
  };

  if (!destination?.countryCode) {
    return NextResponse.json({ error: 'Destination address required' }, { status: 400 });
  }

  if (!process.env.EASYPOST_API_KEY) {
    // No account set up yet — use the flat-rate fallback rather than
    // blocking every checkout entirely.
    return NextResponse.json({ rates: flatRateFallback(destination), fallback: true });
  }

  try {
    const rates = await easypostProvider.getRates(
      WAREHOUSE_ORIGIN,
      destination,
      { weightGrams: totalWeightGrams || 500 },
    );
    if (rates.length === 0) {
      return NextResponse.json({ rates: flatRateFallback(destination), fallback: true });
    }
    return NextResponse.json({ rates });
  } catch (err) {
    console.error('Shipping rate error, using flat-rate fallback:', err);
    return NextResponse.json({ rates: flatRateFallback(destination), fallback: true });
  }
}
