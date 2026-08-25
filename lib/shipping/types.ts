// lib/shipping/types.ts
// Real-time rates across DHL/FedEx/UPS/etc. are aggregated through a single
// shipping-rate API rather than integrating each carrier directly — see
// easypost.ts. This keeps checkout code carrier-agnostic the same way
// lib/payments keeps it gateway-agnostic.

export interface ShippingAddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;      // state/province
  postalCode?: string;
  countryCode: string;  // ISO 3166-1 alpha-2, e.g. 'US', 'GH', 'GB'
}

export interface ParcelInput {
  weightGrams: number;
  // Simple box dimensions — refine per-product if you start shipping
  // oddly-shaped items (glass tincture bottles vs. capsule boxes, etc.)
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface ShippingRateOption {
  id: string;            // pass this back when purchasing the label
  carrier: string;       // 'DHL', 'FedEx', 'UPS', etc.
  service: string;       // 'Express Worldwide', 'International Priority', etc.
  amountUsdCents: number;
  estimatedDays: number | null;
}

export interface ShippingProvider {
  getRates(
    origin: ShippingAddressInput,
    destination: ShippingAddressInput,
    parcel: ParcelInput,
  ): Promise<ShippingRateOption[]>;
}
