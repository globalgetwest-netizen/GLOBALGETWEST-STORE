# GLOBALGETWEST-STORE — Phase 2: Storefront

Public-facing site: homepage, product catalog, product detail, cart, and the
full checkout flow (address → live shipping rates → payment).

## What's in here

```
app/globals.css                      Design tokens (colors, fonts)
app/layout.tsx                       Root layout, header/footer wrapper
app/page.tsx                         Homepage
app/products/page.tsx                Product listing (with ?category= filter)
app/products/[slug]/page.tsx         Product detail
app/cart/page.tsx                    Cart
app/checkout/page.tsx                Checkout (loads cart, renders CheckoutFlow)
app/orders/[id]/success/page.tsx     Post-payment landing page
app/api/cart/route.ts                Add/update/remove cart items
app/api/addresses/route.ts           Save a shipping/billing address
app/api/shipping-rates/route.ts      Live DHL/FedEx/etc. rates via EasyPost
components/                          Header, Footer, ProductCard, AddToCartForm,
                                      CartItemRow, CheckoutFlow
lib/catalog.ts                       Product queries
lib/countries.ts                     Country list + currency-by-country mapping
lib/shipping/                        Shipping provider abstraction (EasyPost adapter)
supabase/migrations/002_shipping_fields.sql   Adds carrier/service/rate_id to orders
```

## How the checkout flow actually works (answering your question directly)

1. **Contact & address** — customer enters name, phone, address lines, city,
   state/region, postal code, and picks their country from a dropdown.
   Country selection also determines currency (`GH`→GHS, `NG`→NGN, everyone
   else→USD) and which payment methods are offered.
2. **Delivery** — once address is entered, the app calls EasyPost with your
   warehouse origin + the customer's destination + total parcel weight, and
   shows real carrier options (DHL, FedEx, etc.) with live prices and
   estimated transit days. Customer picks one.
3. **Payment** — gateway options are filtered to what's valid for the
   resolved currency (Stripe/Grey for USD, Flutterwave for GHS/NGN). Customer
   picks one, gets redirected to that gateway's hosted payment page.
4. On successful payment, the webhook (built in Phase 1) flips the order to
   `paid`, deducts inventory, and the customer lands on the order success page.

## Setup needed before this works end-to-end

1. **EasyPost account** (easypost.com) — sign up, get an API key, and link
   your actual carrier accounts (DHL Express, FedEx, etc.) inside their
   dashboard so real rates come back instead of test-mode placeholders.
2. **Warehouse origin address** — fill in `WAREHOUSE_*` env vars with where
   you're actually shipping from; this is the "from" address on every rate
   request.
3. **Supabase Auth** — this phase assumes signed-in customers (cart/checkout
   redirect to `/account/sign-in` if not). Sign-in/sign-up pages aren't built
   yet — that's part of the admin/auth phase, not this one.
4. Run `supabase/migrations/002_shipping_fields.sql` against your database.
5. Add real product data — right now there's no product entry UI (that's the
   admin portal, next phase), so you'll need to insert rows into `products`,
   `product_variants`, `product_images`, `categories` directly via the
   Supabase dashboard to see the storefront populated.

## Known gaps, called out on purpose

- **Sign-in/sign-up pages don't exist yet.** Cart and checkout both redirect
  to `/account/sign-in`, which is a 404 right now. Building real auth pages
  is next.
- **Tax is hardcoded to 0.** No tax-by-region logic yet.
- **No order history page** (`/account/orders` is linked in the header but
  not built).
- **Image upload isn't built** — product images are just URLs in the
  database for now; you'd upload to Supabase Storage manually or wait for
  the admin portal's upload UI.

## Not yet built (next phases)

- Auth pages (sign in / sign up / account)
- Admin portal (product management, order management, staff accounts, analytics)
- Staff portal (fulfilment queue, inventory adjustments, support)
