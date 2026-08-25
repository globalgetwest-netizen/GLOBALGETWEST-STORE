-- ============================================================================
-- GLOBAL GET WEST STORE — Neon PostgreSQL Schema for Production E-Commerce
-- Designed to replace Supabase schema with full commerce domain model
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. Customers (replaces profiles with extended fields)
CREATE TABLE IF NOT EXISTS public.customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  password_hash TEXT, -- For email/password auth (if not using third-party)
  first_name TEXT,
  last_name  TEXT,
  phone      TEXT,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customer Addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('shipping', 'billing')), -- or separate boolean flags
  recipient_name  TEXT NOT NULL,
  company         TEXT,
  address_line_1  TEXT NOT NULL,
  address_line_2  TEXT,
  city            TEXT NOT NULL,
  state_province  TEXT NOT NULL,
  postal_code     TEXT NOT NULL,
  country         TEXT NOT NULL,
  phone           TEXT NOT NULL,
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Categories (hierarchical)
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL, -- for hierarchical categories
  name        TEXT NOT NULL,
  description TEXT,
  image       TEXT, -- URL or reference to storage
  slug        TEXT NOT NULL UNIQUE, -- for SEO-friendly URLs
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Products
CREATE TABLE IF NOT EXISTS public.products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku            TEXT UNIQUE, -- Stock Keeping Unit
  slug           TEXT NOT NULL UNIQUE, -- for SEO-friendly URLs like /product/product-slug
  name           TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  brand          TEXT,
  category_id    UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
  published_state TEXT NOT NULL DEFAULT 'unpublished' CHECK (published_state IN ('unpublished', 'published', 'scheduled')),
  base_price     NUMERIC(12,2) NOT NULL DEFAULT 0, -- in base currency (e.g., GHS)
  compare_at_price NUMERIC(12,2), -- original price before discount
  cost           NUMERIC(12,2), -- cost of goods sold
  currency       TEXT NOT NULL DEFAULT 'GHS', -- ISO 4217 currency code
  weight         NUMERIC(8,3), -- in kg
  length         NUMERIC(8,3), -- in cm
  width          NUMERIC(8,3), -- in cm
  height         NUMERIC(8,3), -- in cm
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  tax_category   TEXT, -- reference to tax rules
  seo_title      TEXT,
  seo_description TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at   TIMESTAMPTZ NULL
);

-- 5. Product Images
CREATE TABLE IF NOT EXISTS public.product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alt_text    TEXT,
  sort_order  INTEGER DEFAULT 0,
  -- Image URLs/references would point to storage (Cloudflare R2/Images)
  -- We could store multiple variants: original, thumbnail, medium, large, etc.
  -- For simplicity, we'll store the main image URL and assume image service handles variants
  image_url   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Product Variants (for size, color, flavor, etc.)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku         TEXT UNIQUE, -- Variant-specific SKU
  name        TEXT NOT NULL, -- e.g., "Large", "Red", "250ml"
  attributes  JSONB, -- flexible attribute storage: {"size": "Large", "color": "Red"}
  price_adjustment NUMERIC(12,2) DEFAULT 0, -- adjustment to base price
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  weight      NUMERIC(8,3),
  length      NUMERIC(8,3),
  width       NUMERIC(8,3),
  height      NUMERIC(8,3),
  barcode     TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Inventory Movements (for tracking stock changes)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('purchase', 'sale', 'adjustment', 'return', 'restock', 'damage', 'loss')),
  quantity    INTEGER NOT NULL, -- positive for increase, negative for decrease
  reference   TEXT, -- reference to order, adjustment ID, etc.
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Carts
CREATE TABLE IF NOT EXISTS public.carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Cart Items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  -- We snapshot price at time of adding to cart to protect against price changes
  unit_price  NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT UNIQUE, -- human-readable order number like GW-100001
  customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  currency        TEXT NOT NULL, -- ISO 4217
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status  TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  fulfillment_status TEXT NOT NULL DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned')),
  -- Snapshots of addresses at time of order
  shipping_address JSONB, -- stores the full address as JSON
  billing_address  JSONB,
  shipping_method  TEXT,
  tracking_number  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  -- Snapshots of product details at time of purchase
  product_name   TEXT NOT NULL,
  product_sku    TEXT,
  variant_name   TEXT,
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(12,2) NOT NULL,
  currency       TEXT NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price    NUMERIC(12,2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL, -- e.g., 'paystack', 'flutterwave', 'stripe'
  provider_tx_id   TEXT, -- transaction ID from provider
  amount           NUMERIC(12,2) NOT NULL,
  currency         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'partially_refunded')),
  payment_method   TEXT, -- e.g., 'card', 'mobile_money', 'bank_transfer'
  gateway_response JSONB, -- raw response from payment gateway
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Shipping
CREATE TABLE IF NOT EXISTS public.shipments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier     TEXT, -- e.g., 'DHL', 'FedEx', 'UPS', 'Postal Service'
  service     TEXT, -- e.g., 'Express', 'Standard', 'Economy'
  tracking_number TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'in_transit', 'delivered', 'failed', 'returned')),
  shipping_cost NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL,
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Coupons / Discounts
CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE, -- e.g., 'SAVE10'
  description     TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value  NUMERIC(12,2) NOT NULL, -- percentage or fixed amount
  currency        TEXT, -- for fixed_amount discounts
  minimum_purchase NUMERIC(12,2) DEFAULT 0,
  maximum_discount NUMERIC(12,2), -- max discount amount for percentage coupons
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  usage_limit     INTEGER, -- total usage limit across all customers
  usage_limit_per_customer INTEGER DEFAULT 1,
  current_usage   INTEGER DEFAULT 0,
  applies_to      TEXT CHECK (applies_to IN ('all', 'specific_products', 'specific_categories')),
  -- For specific products/categories, we could use JSONB arrays or separate join tables
  -- For simplicity, we'll use JSONB to store product_ids or category_ids
  applies_to_ids  JSONB, -- array of product or category UUIDs
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Product Reviews
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title       TEXT,
  comment     TEXT,
  -- Could add verified_purchase flag, helpful votes, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Wishlists
CREATE TABLE IF NOT EXISTS public.wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'My Wishlist',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Wishlist Items
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Admin Users & Roles (separate from customers)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name  TEXT,
  last_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'product_manager', 'order_manager', 'customer_support', 'content_manager', 'finance')),
  is_active   BOOLEAN DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  TEXT NOT NULL CHECK (actor_type IN ('customer', 'admin_user', 'system')),
  actor_id    UUID, -- references customer_id or admin_user_id
  actor_email TEXT, -- denormalized for easy querying
  action      TEXT NOT NULL, -- e.g., 'create_product', 'update_price', 'change_order_status'
  entity_type TEXT NOT NULL, -- e.g., 'product', 'order', 'customer'
  entity_id   UUID,
  entity_name TEXT, -- denormalized for easy querying
  changes     JSONB, -- stores what changed: {"price": {"old": 100, "new": 120}}
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Settings / Configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  `key`       TEXT NOT NULL UNIQUE,
  value       JSONB, -- flexible storage for various settings
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);

-- Customer Addresses
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_default ON public.customer_addresses(customer_id, is_default) WHERE is_default = TRUE;

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_published_state ON public.products(published_state);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- Product Images
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sort_order ON public.product_images(product_id, sort_order);

-- Product Variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON public.product_variants(is_active);

-- Inventory Movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_id ON public.inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at DESC);

-- Carts
CREATE INDEX IF NOT EXISTS idx_carts_customer_id ON public.carts(customer_id);

-- Cart Items
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON public.cart_items(variant_id);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON public.orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Shipments
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);

-- Coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(active);
CREATE INDEX IF NOT EXISTS idx_coupons_starts_ends ON public.coupons(starts_at, ends_at);

-- Product Reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_customer_id ON public.product_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at DESC);

-- Wishlists
CREATE INDEX IF NOT EXISTS idx_wishlists_customer_id ON public.wishlists(customer_id);

-- Wishlist Items
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON public.wishlist_items(product_id);

-- Admin Users
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Settings
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(`key`);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update updated_at timestamp on products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Similar triggers for other tables that need updated_at
-- (categories, product_variants, carts, cart_items, orders, order_items, payments, shipments, coupons, product_reviews, wishlists, admin_users, audit_logs, settings)
-- For brevity, I'm showing the pattern; in practice, you'd create these for each table

-- ============================================================================
-- INITIAL DATA (OPTIONAL)
-- ============================================================================

-- Insert a default super admin (password should be set via environment variable or first-run script)
-- INSERT INTO public.admin_users (email, password_hash, first_name, last_name, role)
-- VALUES ('admin@globalgetwest.com', '$2b$12$hashedpasswordhere', 'Super', 'Admin', 'super_admin')
-- ON CONFLICT (email) DO NOTHING;

-- Insert default settings
-- INSERT INTO public.settings (`key`, value, description)
-- VALUES ('store_name', '{"value": "GLOBALGETWEST Marketplace"}', 'Store display name'),
--        ('base_currency', '{"value": "GHS"}', 'Base currency for the store'),
--        ('default_tax_rate', '{"value": 0.0}', 'Default tax rate as decimal (e.g., 0.175 for 17.5%)')
-- ON CONFLICT (`key`) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.customers IS 'Customer accounts';
COMMENT ON TABLE public.customer_addresses IS 'Shipping and billing addresses for customers';
COMMENT ON TABLE public.categories IS 'Product categories (hierarchical)';
COMMENT ON TABLE public.products IS 'Products for sale';
COMMENT ON TABLE public.product_images IS 'Images associated with products';
COMMENT ON TABLE public.product_variants IS 'Product variants (size, color, etc.)';
COMMENT ON TABLE public.inventory_movements IS 'History of inventory changes';
COMMENT ON TABLE public.carts IS 'Shopping carts';
COMMENT ON TABLE public.cart_items IS 'Items in shopping carts';
COMMENT ON TABLE public.orders IS 'Customer orders';
COMMENT ON TABLE public.order_items IS 'Items within orders';
COMMENT ON TABLE public.payments IS 'Payment transactions';
COMMENT ON TABLE public.shipments IS 'Shipment tracking';
COMMENT ON TABLE public.coupons IS 'Discount coupons and promo codes';
COMMENT ON TABLE public.product_reviews IS 'Customer product reviews';
COMMENT ON TABLE public.wishlists IS 'Customer wishlists';
COMMENT ON TABLE public.wishlist_items IS 'Items in wishlists';
COMMENT ON TABLE public.admin_users IS 'Administrative users';
COMMENT ON TABLE public.audit_logs IS 'Audit trail of important actions';
COMMENT ON TABLE public.settings IS 'System configuration and settings';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================