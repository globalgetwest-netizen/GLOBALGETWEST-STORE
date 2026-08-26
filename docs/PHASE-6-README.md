# GLOBALGETWEST-STORE — Phase 6: CEO Tier & Country-Scoped Staff

Adds a CEO role above Admin, and country assignment for staff so the
fulfilment queue scopes to what each staff member is actually responsible
for as operations expand to more countries.

## ⚠️ Migration 006 must run in TWO separate steps

Postgres won't let you use a brand-new enum value (`'ceo'`) in the same
transaction that created it, and Supabase's SQL Editor runs a pasted script
as one transaction. So:

**Step 1** — run just this one line by itself, select it and click Run:
```sql
alter type user_role add value if not exists 'ceo';
```

**Step 2** — then run the rest of `006_ceo_and_country_scoping.sql` (everything
after that line) as a separate execution.

If you paste the whole file at once you'll get an error like *"unsafe use of
new value of enum type"* — that's this exact issue, not a bug in the file.

## What's in here

```
supabase/migrations/006_ceo_and_country_scoping.sql   Two-step migration, see above
lib/admin/guard.ts            Now exports requireCeo() alongside requireAdmin()
                               (requireAdmin() accepts both admin AND ceo)
app/admin/layout.tsx           Shows "Admin Accounts" nav link only for CEO
app/admin/admins/              CEO-only: promote a customer to Admin, deactivate admins
app/api/admin/admins/          CEO-only API, backed by RLS (see below)
components/admin/AdminManager.tsx
components/admin/StaffManager.tsx   Now includes country assignment on promotion
app/api/admin/staff/route.ts   Accepts countryCode on staff promotion
app/staff/page.tsx             Queue now filters by the staff member's country
app/staff/orders/page.tsx      Same filtering
app/api/checkout/route.ts      Now stamps shipping_country_code on every new order
app/admin/orders/page.tsx      Shows country column for admin/CEO visibility
```

## The hierarchy, concretely

- **CEO** (you) — everything Admin can do, plus the only one who can promote
  someone to Admin or deactivate an Admin account. There should be exactly
  one CEO account; nothing in the UI lets a CEO demote or reassign the CEO
  role — that's deliberate, to avoid ever accidentally locking yourself out.
  If you ever need a second CEO or a CEO handoff, that's a direct SQL update,
  not a UI action.
- **Admin** — can manage products, categories, orders (all countries), and
  promote/manage **Staff** accounts (not other Admins — see below).
- **Staff** — scoped to fulfilment/inventory actions, and now optionally
  scoped to one country. A staff member with no country assigned sees
  everything (useful for someone covering multiple markets, or during
  early-stage low order volume).

## The security boundary this closes

The original `admin manage profiles` RLS policy let any Admin update *any*
profile — including handing themselves or someone else the Admin role. That
policy is now split in two:
- Admin can only write to `customer` and `staff` role profiles
- Only CEO (`is_ceo()`) can write to `admin` role profiles

Same pattern as migration 005's staff-order restrictions: the real boundary
is the database policy, not just which button the UI shows. The API routes
also check the role for a clean error message, but RLS is what actually
stops it if that check were ever missing or bypassed.

## Country scoping — what's actually restricted vs. what isn't

**Restricted:** the staff *queue and order-list views* filter to the staff
member's assigned country. A staff member assigned to Ghana only sees Ghana
orders in `/staff` and `/staff/orders`.

**Not restricted:** a staff member can still open any specific order by
direct link/ID and read it, regardless of country — RLS's
`is_staff_or_admin()` policy on orders doesn't check country. This is a
deliberate choice, not an oversight: a support inquiry about an order from
outside someone's assigned country shouldn't be a dead end. If you want hard
country-level read restriction instead (a Ghana staff member literally
cannot open a Nigeria order under any circumstance), that's a further RLS
change — flag it if that's actually the model you want, since it's a
meaningfully stricter posture than "scoped queue, open lookup."

## Still outstanding

- **Logo not received yet** — nothing uploaded in the conversation. Once you
  send the file, it needs to go into `/public` and be wired into
  `components/Header.tsx` (replacing the text wordmark) and likely a
  favicon — that's a small follow-up once the file's in hand.
- **Per-country analytics** (revenue/order breakdown by country on the
  dashboard) isn't built — the data now exists to build it
  (`shipping_country_code` on every order), just not the dashboard view yet.
- **Domain is still not attached anywhere.** Nothing has been deployed —
  everything so far has only run on `localhost`. Attaching
  globalgetwest.com happens after a real deploy to Vercel (or another
  host), which hasn't happened yet.
