-- ============================================================================
-- GLOBAL GET WEST STORE — Supabase schema, security (RLS) and setup
-- Run this once in your Supabase project: SQL Editor → paste → Run.
-- Safe to re-run (idempotent).
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ─── PROFILES ───────────────────────────────────────────────────────────────
-- One row per auth user. `role` gates admin access ('customer' | 'admin').
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  role       text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

-- ─── CATEGORIES ─────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  image       text,
  created_at  timestamptz not null default now()
);

-- ─── PRODUCTS ───────────────────────────────────────────────────────────────
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  price          numeric(12,2) not null default 0,
  image          text,
  payment_link   text,
  category_id    uuid references public.categories(id) on delete set null,
  stock_quantity integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists products_category_id_idx on public.products(category_id);

-- ─── CARTS ──────────────────────────────────────────────────────────────────
create table if not exists public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity   integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists carts_user_id_idx on public.carts(user_id);

-- ─── ORDERS ─────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete set null,
  total              numeric(12,2) not null default 0,
  status             text not null default 'Pending',   -- Pending | Processing | Shipped | Completed | Cancelled
  payment_status     text not null default 'Pending',   -- Pending | Paid | Failed
  paystack_reference text,                               -- Paystack transaction reference
  created_at         timestamptz not null default now()
);
create index if not exists orders_user_id_idx on public.orders(user_id);
create unique index if not exists orders_paystack_reference_idx
  on public.orders(paystack_reference) where paystack_reference is not null;

-- ─── ORDER ITEMS ────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity   integer not null default 1,
  price      numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- ============================================================================
-- Helper: is the current user an admin?
-- SECURITY DEFINER so it can read profiles.role without recursing into RLS.
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- Auto-create a profile row whenever a new auth user signs up.
-- The signup form then upserts full_name on top of this.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.carts       enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- PROFILES: a user sees/edits their own row; admins see all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- CATEGORIES & PRODUCTS: public can read; only admins can write.
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select using (true);
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (true);
drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- CARTS: each user manages only their own cart.
drop policy if exists carts_all_own on public.carts;
create policy carts_all_own on public.carts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ORDERS: a user reads their own orders; admins read all.
-- (Writes happen server-side with the service-role key, which bypasses RLS.)
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- ORDER ITEMS: visible if you can see the parent order.
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- ============================================================================
-- AFTER RUNNING THIS:
--   1) Storage: create a PUBLIC bucket named  product-images
--      (Dashboard → Storage → New bucket → name: product-images → Public).
--   2) Make yourself an admin (replace the email):
--        update public.profiles set role = 'admin' where email = 'you@example.com';
--   3) (Optional) turn OFF "Confirm email" in Auth settings for instant signup,
--      or leave it on — the trigger above creates the profile either way.
-- ============================================================================
