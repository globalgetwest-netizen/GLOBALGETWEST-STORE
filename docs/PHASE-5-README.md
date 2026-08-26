# GLOBALGETWEST-STORE — Phase 5: Staff Portal

Scoped fulfilment/inventory view for staff accounts — deliberately narrower
than the admin portal, both in the UI and (this is the part worth reading
closely) enforced again at the database level, not just hidden by navigation.

## What's in here

```
app/staff/layout.tsx                Sidebar nav, calls requireStaff()
app/staff/page.tsx                  My Queue — assigned + unassigned orders needing fulfilment
app/staff/orders/                   All orders (filterable), detail with claim/status/notes
app/staff/inventory/                Stock levels, adjustment modal (reason required)
app/api/staff/orders/[id]/route.ts  Status/assignment updates — allowlisted, see below
app/api/staff/inventory/route.ts    Stock adjustments (writes to the append-only ledger)
lib/staff/guard.ts                  requireStaff() — page-level auth check
components/staff/                   StaffOrderPanel, InventoryManager
supabase/migrations/005_staff_order_restrictions.sql   DB-level enforcement, see below
```

## The thing worth understanding about how this is locked down

Phase 4's admin `orders` RLS policy (`staff update orders`) allows *any*
staff or admin to update *any* column on an order — it only checks role, not
which fields change. That's fine for admin, but for staff it left a real
gap: the API route in this phase restricts staff to fulfilment-stage
statuses (`processing` → `fulfilled` → `shipped` → `delivered`) and
self-assignment only, but a staff member could bypass that API and call
Supabase directly from browser devtools with their own session, since RLS
itself didn't stop them.

**Migration `005_staff_order_restrictions.sql` closes that** with a
`before update` trigger on `orders` that enforces, at the database level:
- Staff can only change `status` into a fulfilment-stage value — never into
  `paid`, `pending_payment`, `cancelled`, or `refunded` (those stay
  payment-webhook or admin-only)
- Staff can only set `assigned_staff_id` to their own id, never someone
  else's
- Staff cannot modify any financial field (`total_usd_cents`,
  `subtotal_usd_cents`, `shipping_usd_cents`, `tax_usd_cents`, `currency`)
  at all

Admins are unrestricted by this trigger. This is the same "RLS is the real
boundary, the API is a convenience layer" pattern the rest of this schema
uses — worth keeping in mind if you add more staff-facing write actions
later: ask whether RLS actually stops the thing you don't want staff doing,
not just whether the UI hides the button.

## Inventory adjustments

Every stock change goes through the append-only `inventory_movements`
ledger (from Phase 1's schema) with a required reason (`restock`,
`correction`, `damage`, `return`) and optional note. Nothing overwrites a
stock number directly — current stock is always the sum of the ledger,
visible via the `variant_stock` view.

## Setup needed

Run `supabase/migrations/005_staff_order_restrictions.sql`. Nothing else new
— this phase reuses Phase 3's auth and Phase 4's staff-promotion flow.

## Known gaps

- Staff can't message customers about an order from this portal — no
  contact/notification tooling built yet.
- No shipping label purchase — the shipping rate/carrier is recorded from
  checkout, but actually generating and printing a DHL/FedEx label via
  EasyPost's label-purchase API (as opposed to just rate-shopping) isn't
  built. Worth doing once you're ready to fulfil real orders.
- Support department has no dedicated tooling yet (no ticket/inquiry system) —
  the department field exists on staff profiles but nothing in the UI uses
  it differently per department yet.

## Where the build stands now

All five phases (data/payments, storefront, auth, admin, staff) are built
and are real, working code — not mockups. What's genuinely left before this
is a finished, launched store: live payment gateway accounts (Stripe/
Flutterwave/Grey — flagged in Phase 1), an EasyPost account with real
carrier accounts linked (Phase 2), product data entered, image upload
tooling, customer-facing order-status emails, and a general QA/visual
polish pass once there's real content to look at it with.
