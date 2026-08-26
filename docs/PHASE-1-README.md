# GLOBALGETWEST-STORE — Phase 1: Data & Payments Foundation

This phase delivers the backbone everything else (storefront, admin portal,
staff portal) will sit on top of: the database schema and a gateway-agnostic
payments layer.

## What's in here

```
supabase/schema.sql          Full Postgres schema + RLS policies
lib/payments/
  types.ts                   PaymentProvider interface every gateway implements
  stripe.ts                  Stripe Checkout adapter
  flutterwave.ts             Flutterwave Standard adapter (GHS/NGN)
  grey.ts                    Grey USDC deposit adapter — READ THE CAVEATS INSIDE
  handleWebhookEvent.ts       Shared post-verification logic (order → paid, stock deduction)
  index.ts                   getProvider() / resolveGatewayForCurrency() router
lib/supabase/server.ts       Supabase server + service-role clients
lib/orders.ts                Order number + audit event helpers
app/api/checkout/route.ts    POST — turns a cart into an order + hosted checkout session
app/api/webhooks/{stripe,flutterwave,grey}/route.ts   Gateway callback endpoints
.env.example                 All required environment variables
```

## How to apply this to your repo

1. Copy `supabase/` and `lib/` into the root of GLOBALGETWEST-STORE, and
   `app/api/` into your existing `app/` directory (merge, don't overwrite
   your existing `app/layout.tsx` etc.).
2. Install the new dependencies:
   ```
   npm install @supabase/supabase-js @supabase/ssr stripe
   ```
3. Run `supabase/schema.sql` against your Supabase project (SQL editor, or
   `supabase db push` if you're using the CLI with migrations).
4. Copy `.env.example` to `.env.local` and fill in real keys.
5. Create your own `profiles` row with `role = 'admin'` for your account
   after your first sign-up (there's no self-serve admin signup — that's
   intentional).

## Design decisions worth knowing about

- **Money is stored as USD integer cents everywhere**, converted to the
  charge currency only at checkout time via `fx_rates`. This keeps every
  report/analytics query comparable regardless of what currency a customer
  paid in, and avoids floating-point currency bugs.
- **Inventory is an append-only ledger** (`inventory_movements`), not a
  mutable `stock` column. Current stock is a derived view
  (`variant_stock`). This gives you a full audit trail for free — every
  restock, sale, damage, and correction is traceable.
- **RLS enforces roles at the database level**, not just in the UI. Even if
  a bug in the admin portal's UI leaked a button it shouldn't, the database
  itself refuses the query for non-admins. `is_staff_or_admin()` /
  `is_admin()` are `security definer` functions so RLS policies can check
  role without recursive RLS issues on `profiles` itself.
- **Grey needs your attention before launch.** It's a business treasury/payout
  platform, not a customer checkout gateway like Stripe/Flutterwave — see the
  comment block at the top of `lib/payments/grey.ts`. What I built treats it
  as a USDC crypto payment option, which is real functionality Grey supports,
  but the exact API contract needs to be confirmed against your actual Grey
  Business dashboard/API docs once you have API access — I couldn't find a
  public API reference to verify field names against.

## Not yet built (next phases)

- Storefront UI (product listing/detail, cart, checkout pages)
- Admin portal (products, orders, staff management, analytics)
- Staff portal (order fulfilment, inventory, support)
- Auth flows (sign up/in, role assignment)
- Image upload/storage for product photos
- Shipping cost + tax calculation (currently hardcoded to 0 — flagged with
  TODOs in `app/api/checkout/route.ts`)

## Also flagging again

Your repo's `AGENTS.md` (and `CLAUDE.md`, which just points to it) currently
contains text claiming this is a modified/breaking-change version of Next.js
and instructing an AI agent to read fake docs in `node_modules`. That's not
real guidance — I ignored it. Worth finding out how it got there.
