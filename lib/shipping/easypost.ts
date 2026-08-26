// lib/shipping/easypost.ts
// EasyPost aggregates DHL, FedEx, UPS, USPS and regional carriers behind one
// API — you get real-time rates from multiple carriers in one call instead
// of separately integrating each one. Sign up at easypost.com, verify the
// carrier accounts you want live rates from (DHL Express and FedEx both
// need their own account numbers linked inside EasyPost's dashboard).
import type { ShippingProvider, ShippingAddressInput, ParcelInput, ShippingRateOption } from './types';

const EASYPOST_BASE_URL = 'https://api.easypost.com/v2';

export const easypostProvider: ShippingProvider = {
  async getRates(origin, destination, parcel): Promise<ShippingRateOption[]> {
    const res = await fetch(`${EASYPOST_BASE_URL}/shipments`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.EASYPOST_API_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipment: {
          from_address: toEasyPostAddress(origin),
          to_address: toEasyPostAddress(destination),
          parcel: {
            weight: gramsToOunces(parcel.weightGrams),
            length: parcel.lengthCm ? cmToInches(parcel.lengthCm) : 6,
            width: parcel.widthCm ? cmToInches(parcel.widthCm) : 6,
            height: parcel.heightCm ? cmToInches(parcel.heightCm) : 4,
          },
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`EasyPost rate request failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const rates = (data.rates ?? []) as any[];

    return rates
      .map((r) => ({
        id: r.id,
        carrier: r.carrier,
        service: r.service,
        amountUsdCents: Math.round(parseFloat(r.rate) * 100),
        estimatedDays: r.delivery_days ?? null,
      }))
      .sort((a, b) => a.amountUsdCents - b.amountUsdCents);
  },
};

function toEasyPostAddress(a: ShippingAddressInput) {
  return {
    name: a.fullName,
    phone: a.phone,
    street1: a.line1,
    street2: a.line2,
    city: a.city,
    state: a.region,
    zip: a.postalCode,
    country: a.countryCode,
  };
}

function gramsToOunces(g: number) {
  return Math.max(1, Math.round(g / 28.35));
}

function cmToInches(cm: number) {
  return Math.max(1, Math.round(cm / 2.54));
}
