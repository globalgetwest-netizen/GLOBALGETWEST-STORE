# GLOBALGETWEST-STORE — Phase 4: Admin Portal

Full product management, category management, order management, and staff
account administration — all wired to the real database, gated by both a
page-level guard and Postgres RLS (defense in depth: even if the guard had a
bug, the database itself refuses non-admin writes).

## What's in here

```
app/admin/layout.tsx              Sidebar nav, calls requireAdmin()
app/admin/page.tsx                Dashboard — real revenue/order/stock queries
app/admin/products/               List, new, edit (variants + images inline)
app/admin/categories/             List + inline create/toggle
app/admin/orders/                 List (filterable by status), detail (status,
                                   staff assignment, notes, full audit log)
app/admin/staff/                  Promote existing customers to staff, manage
                                   department, deactivate
app/api/admin/products/           CRUD, replaces variants/images as a set on edit
app/api/admin/categories/         Create, toggle active
app/api/admin/orders/[id]/        Status change, staff assignment, notes —
                                   every change logged to order_events
app/api/admin/staff/              Promote by email, deactivate, change department
lib/admin/guard.ts                requireAdmin() — page-level auth check
components/admin/                 ProductForm, CategoryManager, OrderDetailPanel,
                                   StaffManager
supabase/migrations/004_profile_email.sql   Adds email to profiles for staff lookup
```

## How staff accounts actually work

There's no staff signup form, on purpose — this prevents anyone from
self-registering as staff. The flow is:

1. The person signs up normally at `/account/sign-up` (becomes `customer`).
2. An admin goes to `/admin/staff`, enters their email, picks a department
   (fulfilment / inventory / support / general), and promotes them.
3. They sign out and back in (or just refresh) — their account now has
   `role = 'staff'` and can access `/staff` (built in Phase 5).

Only an admin can promote/demote/deactivate — RLS enforces this at the
database level via the `admin manage profiles` policy, and a customer
literally cannot self-promote even by calling the API directly (the `update
own profile` policy only permits updates that keep `role = 'customer'`).

## Product editing — how variants/images are saved

The edit form replaces the full variant/image set on every save (delete
anything removed from the form, upsert the rest) rather than diffing
individual fields. This is simpler and correct for a low-frequency admin
action; if you start editing products dozens of times a day, it's worth
revisiting for a version that patches instead of replaces.

## What "perfect" honestly can't mean yet

This is a real, working admin portal — not a mockup, every button is wired
to an actual query. But calling anything "perfect" on a first pass isn't
honest, so here's what still needs your eyes before you'd call this
production-ready:

- **No image upload UI** — images are still pasted URLs. Supabase Storage
  integration for actual file upload is a reasonable Phase 6 addition.
- **Order status changes don't trigger customer emails** — status changes
  are logged and visible to the customer if they check `/account/orders`,
  but nothing proactively emails them yet.
- **No bulk actions** — products/orders are managed one at a time.
- **No analytics beyond the dashboard's basic revenue/order/stock counts** —
  no charts, no per-product sales breakdown yet.
- **Variant/image replace-on-save** (above) is a reasonable v1 choice, not
  a permanent architectural decision.

## Not yet built (next phase)

- Staff portal (scoped fulfilment/inventory/support view — no financial or
  staff-management access, per the original design)
