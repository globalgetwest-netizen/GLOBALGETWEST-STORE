// app/api/shipping-rates/route.ts
// Called from the checkout page once the customer has entered their address,
// so they can pick a carrier/service before paying.
import { NextRequest, NextResponse } from 'next/server';
import { easypostProvider } from '@/lib/shipping/easypost';
import type { ShippingAddressInput } from '@/lib/shipping/types';

const WAREHOUSE_ORIGIN: ShippingAddressInput = {
  fullName: 'GLOBALGETWEST Fulfilment',
  phone: process.env.WAREHOUSE_PHONE ?? '',
  line1: process.env.WAREHOUSE_ADDRESS_LINE1 ?? '',
  city: process.env.WAREHOUSE_CITY ?? '',
  region: process.env.WAREHOUSE_REGION,
  postalCode: process.env.WAREHOUSE_POSTAL_CODE,
  countryCode: process.env.WAREHOUSE_COUNTRY_CODE ?? 'US',
};

export async function POST(req: NextRequest) {
  const { destination, totalWeightGrams } = await req.json() as {
    destination: ShippingAddressInput;
    totalWeightGrams: number;
  };

  if (!destination?.countryCode) {
    return NextResponse.json({ error: 'Destination address required' }, { status: 400 });
  }

  try {
    const rates = await easypostProvider.getRates(
      WAREHOUSE_ORIGIN,
      destination,
      { weightGrams: totalWeightGrams || 500 },
    );
    return NextResponse.json({ rates });
  } catch (err) {
    console.error('Shipping rate error:', err);
    return NextResponse.json({ error: 'Could not fetch shipping rates' }, { status: 502 });
  }
}
