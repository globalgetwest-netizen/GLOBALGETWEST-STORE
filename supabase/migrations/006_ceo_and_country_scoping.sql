-- Adds a CEO tier above admin, and country assignment for staff so orders,
-- inventory, and the fulfilment queue can be scoped per country as the
-- operation expands. Design choices explained inline below.

-- 1. Extend the role enum. Postgres enums can't have values removed easily,
--    so this is additive-only, which is the safe direction anyway.
alter type user_role add value if not exists 'ceo';

-- 2. Country assignment on profiles. Null means "global" (unscoped) — used
--    for admin/ceo, who see everything regardless of country, and can also
--    be used for a staff member who genuinely covers multiple countries.
alter table profiles add column if not exists country_code text;

-- 3. Denormalized shipping country on orders. We could join through
--    shipping_address_id -> addresses.country_code every time, but staff
--    country-scoping runs on every order list/queue view, so a denormalized
--    column keeps that filter a plain indexed equality check instead of a
--    join on every query. Populated at checkout time (app code), backfilled
--    here for any orders that predate this migration.
alter table orders add column if not exists shipping_country_code text;

update orders o
set shipping_country_code = a.country_code
from addresses a
where o.shipping_address_id = a.id
  and o.shipping_country_code is null;

create index if not exists idx_orders_shipping_country on orders(shipping_country_code);

-- 4. is_ceo() helper, matching the is_admin()/is_staff_or_admin() pattern
--    already in the schema.
create function is_ceo() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'ceo' and is_active = true
  );
$$ language sql security definer stable;

-- 5. Only CEO can create/modify Admin accounts. The existing 'admin manage
--    profiles' policy (schema.sql) lets any admin update any profile,
--    including granting the admin role to someone else — that's the exact
--    kind of gap we closed for staff/orders in migration 005, so close it
--    here too before it's ever used in anger.
drop policy if exists "admin manage profiles" on profiles;

create policy "admin manage staff profiles" on profiles
  for all using (
    is_admin() and role in ('customer', 'staff')
  ) with check (
    is_admin() and role in ('customer', 'staff')
  );

create policy "ceo manage all profiles" on profiles
  for all using (is_ceo()) with check (is_ceo());

-- Admin/CEO still need read access to admin profiles (e.g. to list who's
-- an admin) even though only CEO can write them — add that separately.
create policy "admin read all profiles" on profiles
  for select using (is_admin() or is_ceo());

-- 6. CEO gets the same unrestricted order/product/category access as admin.
--    Simplest correct way: update is_admin()-based policies to also allow
--    is_ceo(), by redefining is_admin() to include ceo. This keeps every
--    existing "using (is_admin())" policy across the schema (products,
--    categories, orders financial fields, etc.) working for CEO without
--    rewriting each one individually.
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'ceo') and is_active = true
  );
$$ language sql security definer stable;

-- 7. Staff country-scoping on orders. Staff can already read all orders
--    (is_staff_or_admin() on the 'own orders' select policy) — that stays
--    true for now (a staff member can still look up any order by number for
--    support purposes), but the *queue/list views* in the app now filter by
--    shipping_country_code client-side against the staff member's assigned
--    country. Enforcing country-scoping as a hard RLS read restriction is a
--    bigger change (it would break "look up any order by number") — noted
--    as a deliberate choice, not an oversight, in the phase README.
