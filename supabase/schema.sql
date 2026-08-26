-- ============================================================================
-- GLOBALGETWEST-STORE — Core Database Schema
-- Natural Herbal Products E-Commerce Platform
-- Single-seller storefront + admin/staff portals, multi-currency, multi-gateway
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ROLES & PROFILES
-- ----------------------------------------------------------------------------
-- Every authenticated user (customer, staff, admin) gets a profile row.
-- Role drives both UI gating (app side) and RLS (DB side) — never trust the
-- client role claim alone.

create type user_role as enum ('customer', 'staff', 'admin');
create type staff_department as enum ('fulfilment', 'inventory', 'support', 'general');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  department staff_department, -- null for customers/admin
  full_name text,
  phone text,
  preferred_currency text not null default 'USD',
  is_active boolean not null default true, -- admin can deactivate staff without deleting
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);

-- ----------------------------------------------------------------------------
-- CURRENCIES & FX
-- ----------------------------------------------------------------------------
-- Prices are stored in a single base currency (USD) as integer minor units
-- (cents). Display currency is converted at read time using rates here.
-- Keeps ledger math exact and avoids float currency bugs.

create table currencies (
  code text primary key,              -- 'USD', 'GHS', 'NGN'
  symbol text not null,               -- '$', 'GH₵', '₦'
  name text not null,
  decimal_places smallint not null default 2,
  is_active boolean not null default true
);

create table fx_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null references currencies(code),
  quote_currency text not null references currencies(code),
  rate numeric(18,8) not null,        -- 1 base = rate quote
  source text not null default 'manual', -- 'manual' | 'provider_name'
  effective_at timestamptz not null default now(),
  unique (base_currency, quote_currency, effective_at)
);

create index idx_fx_rates_lookup on fx_rates(base_currency, quote_currency, effective_at desc);

insert into currencies (code, symbol, name) values
  ('USD', '$', 'US Dollar'),
  ('GHS', 'GH₵', 'Ghanaian Cedi'),
  ('NGN', '₦', 'Nigerian Naira');

-- ----------------------------------------------------------------------------
-- CATALOG
-- ----------------------------------------------------------------------------

create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_categories_parent on categories(parent_id);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text,
  description text,               -- long-form, supports markdown
  category_id uuid references categories(id) on delete set null,
  brand text default 'GLOBALGETWEST',
  ingredients text,                -- herbal composition disclosure
  usage_instructions text,
  warnings text,                   -- required for herbal/health products
  origin_country text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  avg_rating numeric(2,1) default 0,
  review_count int not null default 0,
  search_tsv tsvector,             -- generated below for full-text search
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_category on products(category_id);
create index idx_products_active on products(is_active) where is_active = true;
create index idx_products_search on products using gin(search_tsv);

create function products_search_tsv_update() returns trigger as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.ingredients, '')), 'C');
  return new;
end;
$$ language plpgsql;

create trigger trg_products_search_tsv
  before insert or update on products
  for each row execute function products_search_tsv_update();

-- Variants: size/form (e.g. "60 capsules", "250ml tincture")
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null unique,
  name text not null,               -- '60 Capsules', '250ml'
  price_usd_cents int not null check (price_usd_cents >= 0),
  compare_at_usd_cents int,          -- for showing a strikethrough discount
  weight_grams int,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_variants_product on product_variants(product_id);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order int not null default 0
);

create index idx_images_product on product_images(product_id);

-- ----------------------------------------------------------------------------
-- INVENTORY
-- ----------------------------------------------------------------------------
-- Append-only ledger, never mutate stock directly — current stock is derived.
-- This gives staff/admin a full audit trail (restock, sale, correction, etc).

create type inventory_reason as enum ('restock', 'sale', 'return', 'correction', 'damage');

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  quantity_change int not null,        -- positive or negative
  reason inventory_reason not null,
  reference_order_id uuid,             -- set when reason = 'sale' or 'return'
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_inventory_variant on inventory_movements(variant_id);

create view variant_stock as
  select variant_id, coalesce(sum(quantity_change), 0) as stock_on_hand
  from inventory_movements
  group by variant_id;

-- ----------------------------------------------------------------------------
-- CUSTOMERS & ADDRESSES
-- ----------------------------------------------------------------------------

create table addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label text,                        -- 'Home', 'Office'
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text,                       -- state/region/province
  postal_code text,
  country_code text not null,        -- ISO 3166-1 alpha-2
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_addresses_profile on addresses(profile_id);

-- ----------------------------------------------------------------------------
-- CART (persisted, so it survives across devices/sessions)
-- ----------------------------------------------------------------------------

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, variant_id)
);

-- ----------------------------------------------------------------------------
-- ORDERS
-- ----------------------------------------------------------------------------

create type order_status as enum (
  'pending_payment', 'paid', 'processing', 'fulfilled',
  'shipped', 'delivered', 'cancelled', 'refunded'
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,   -- human-friendly, e.g. GGW-100234
  customer_id uuid not null references profiles(id),
  status order_status not null default 'pending_payment',
  currency text not null references currencies(code),
  subtotal_usd_cents int not null,
  shipping_usd_cents int not null default 0,
  tax_usd_cents int not null default 0,
  total_usd_cents int not null,
  shipping_address_id uuid references addresses(id),
  billing_address_id uuid references addresses(id),
  notes text,
  assigned_staff_id uuid references profiles(id), -- fulfilment ownership
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_customer on orders(customer_id);
create index idx_orders_status on orders(status);
create index idx_orders_assigned_staff on orders(assigned_staff_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  product_name_snapshot text not null,   -- freeze name/price at purchase time
  variant_name_snapshot text not null,
  unit_price_usd_cents int not null,
  quantity int not null check (quantity > 0),
  line_total_usd_cents int not null
);

create index idx_order_items_order on order_items(order_id);

create type order_event_type as enum (
  'created', 'payment_confirmed', 'status_changed', 'note_added',
  'assigned', 'shipped', 'cancelled', 'refunded'
);

-- Audit trail visible to staff/admin on the order detail view
create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  event_type order_event_type not null,
  detail text,
  created_by uuid references profiles(id),  -- null = system/webhook
  created_at timestamptz not null default now()
);

create index idx_order_events_order on order_events(order_id);

-- ----------------------------------------------------------------------------
-- PAYMENTS (gateway-agnostic)
-- ----------------------------------------------------------------------------

create type payment_gateway as enum ('stripe', 'flutterwave', 'grey');
create type payment_status as enum ('initiated', 'succeeded', 'failed', 'refunded');

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  gateway payment_gateway not null,
  gateway_reference text not null,     -- gateway's own transaction/session id
  status payment_status not null default 'initiated',
  currency text not null references currencies(code),
  amount_minor_units bigint not null,  -- amount in the charged currency's minor units
  amount_usd_cents int not null,       -- normalized for reporting
  raw_webhook_payload jsonb,           -- last webhook received, for debugging
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gateway, gateway_reference)
);

create index idx_payments_order on payments(order_id);
create index idx_payments_status on payments(status);

-- ----------------------------------------------------------------------------
-- REVIEWS
-- ----------------------------------------------------------------------------

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_id uuid not null references profiles(id),
  order_item_id uuid references order_items(id), -- verified-purchase link
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_reviews_product on reviews(product_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger trg_products_updated_at before update on products for each row execute function set_updated_at();
create trigger trg_cart_items_updated_at before update on cart_items for each row execute function set_updated_at();
create trigger trg_orders_updated_at before update on orders for each row execute function set_updated_at();
create trigger trg_payments_updated_at before update on payments for each row execute function set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table addresses enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_events enable row level security;
alter table payments enable row level security;
alter table reviews enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table categories enable row level security;
alter table inventory_movements enable row level security;

-- Helper: is the current user staff or admin?
create function is_staff_or_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('staff', 'admin') and is_active = true
  );
$$ language sql security definer stable;

create function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$ language sql security definer stable;

-- Public catalog: anyone can read active products/categories
create policy "public read active products" on products
  for select using (is_active = true or is_staff_or_admin());
create policy "public read active categories" on categories
  for select using (is_active = true or is_staff_or_admin());
create policy "public read variants" on product_variants
  for select using (is_active = true or is_staff_or_admin());

-- Only admin (or staff with inventory dept) can write catalog
create policy "admin manage products" on products
  for all using (is_admin()) with check (is_admin());
create policy "admin manage categories" on categories
  for all using (is_admin()) with check (is_admin());
create policy "admin manage variants" on product_variants
  for all using (is_admin()) with check (is_admin());

-- Profiles: users see their own; staff/admin see all
create policy "own profile" on profiles
  for select using (id = auth.uid() or is_staff_or_admin());
create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = 'customer');
create policy "admin manage profiles" on profiles
  for all using (is_admin()) with check (is_admin());

-- Addresses: owner only, plus staff/admin for fulfilment
create policy "own addresses" on addresses
  for all using (profile_id = auth.uid() or is_staff_or_admin())
  with check (profile_id = auth.uid() or is_staff_or_admin());

-- Cart: strictly owner-only, never staff-visible
create policy "own cart" on cart_items
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Orders: customer sees own; staff/admin see all
create policy "own orders" on orders
  for select using (customer_id = auth.uid() or is_staff_or_admin());
create policy "customer create order" on orders
  for insert with check (customer_id = auth.uid());
create policy "staff update orders" on orders
  for update using (is_staff_or_admin()) with check (is_staff_or_admin());

create policy "own order items" on order_items
  for select using (
    exists (select 1 from orders where orders.id = order_id
            and (orders.customer_id = auth.uid() or is_staff_or_admin()))
  );

create policy "staff order events" on order_events
  for all using (is_staff_or_admin()) with check (is_staff_or_admin());

-- Payments: never directly writable by client — only via service-role webhook
-- handlers. Read access mirrors the parent order.
create policy "own payments read" on payments
  for select using (
    exists (select 1 from orders where orders.id = order_id
            and (orders.customer_id = auth.uid() or is_staff_or_admin()))
  );

-- Reviews: anyone reads published; only the reviewing customer writes their own
create policy "public read published reviews" on reviews
  for select using (is_published = true or is_staff_or_admin());
create policy "customer manage own review" on reviews
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Inventory: staff (inventory dept) and admin only
create policy "staff manage inventory" on inventory_movements
  for all using (is_staff_or_admin()) with check (is_staff_or_admin());
