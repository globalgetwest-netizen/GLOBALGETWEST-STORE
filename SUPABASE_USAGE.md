# Supabase Usage in GLOBALGETWEST-STORE

This document details how Supabase is currently used in the codebase, to inform the migration to Neon PostgreSQL.

## 1. Database (@supabase/supabase-js)

### Files using Supabase for database operations:

- `lib/supabase.js`: Creates the Supabase client (anon key) for public/database operations.
- `lib/supabaseAdmin.ts`: Creates the Supabase client (service role key) for admin/server-side operations.
- `app/page.tsx`: Fetches products and categories for the home page.
- `app/product/[id]/page.tsx`: Fetches a single product by ID and related products.
- `app/search/page.tsx`: Searches products by name (ILIKE).
- `app/cart/page.tsx`: Fetches cart items for the logged-in user.
- `app/api/checkout/route.ts`: (Server-side) Creates a pending order from the cart, checks stock, calculates total.
- `app/admin/products/page.tsx`: Lists all products for admin.
- `app/admin/products/new/page.tsx`: (Client-side) Loads categories for the form.
- `app/admin/products/edit/[id]/page.tsx`: (Client-side) Loads a product by ID for editing.
- `app/admin/categories/page.tsx`: Lists all categories.
- `app/admin/categories/new/page.tsx`: (Client-side) Loads nothing for form (just uploads image).
- `app/admin/categories/edit/[id]/page.tsx`: (Client-side) Loads a category by ID for editing.
- `app/admin/orders/page.tsx`: Lists all orders.
- `app/admin/orders/[id]/page.tsx`: (Client-side) Loads a single order and its items.
- `app/admin/customers/page.tsx`: (Server-side via supabaseAdmin) Lists users from Supabase Auth.
- `app/admin/inventory/page.tsx`: Lists products (name, price, image) for inventory view.
- `app/admin/analytics/page.tsx`: Gets counts of products, orders, customers, and total revenue.
- `app/account/page.tsx`: Fetches the logged-in user's orders and cart items.
- `components/AddToCart.tsx`: (Client-side) Checks for user, then checks if product already in cart, then inserts or updates cart.
- `components/AddToCartButton.tsx`: (Client-side) Inserts a product into the cart.
- `components/CartActions.tsx`: (Client-side) Updates cart item quantity or deletes it.
- `components/OrderStatus.tsx`: (Client-side) Updates the status of an order (note: this is a client-side update, which is not secure; the real enforcement should be server-side).
- `app/auth/login/page.tsx`: (Client-side) Uses `supabase.auth.signInWithPassword` to log in.
- `app/auth/signup/page.tsx`: (Client-side) Uses `supabase.auth.signUp` to sign up, then `supabase.from("profiles").upsert` to create a profile.
- `app/api/webhooks/paystack/route.ts`: (Server-side) Does not use Supabase directly; instead uses `lib/orders.confirmOrderPaid` which uses the Supabase admin client.

### Key Database Tables and Columns (from supabase/schema.sql):

- `public.profiles`: id (uuid, references auth.users), full_name, email, role (customer/admin), created_at.
- `public.categories`: id (uuid), name, description, image, created_at.
- `public.products`: id (uuid), name, description, price (numeric), image, payment_link, category_id (uuid, references categories), stock_quantity, created_at.
- `public.carts`: id (uuid), user_id (uuid, references auth.users), product_id (uuid, references products), quantity, created_at.
- `public.orders`: id (uuid), user_id (uuid, references auth.users), paystack_reference (text), payment_status, status, total (numeric), created_at.
- `public.order_items`: id (uuid), order_id (uuid, references orders), product_id (uuid, references products), quantity, price (numeric), created_at.

### Common Patterns:

1. **Fetching Data**: Using `.from("table").select("columns").eq("column", value).single()` or `.order("created_at", {ascending:false})`.
2. **Inserting Data**: Using `.from("table").insert([{column: value}])`.
3. **Updating Data**: Using `.from("table").update({column: value}).eq("id", id)`.
4. **Deleting Data**: Using `.from("table").delete().eq("id", id)`.
5. **Relations**: Using nested selects to fetch related data (e.g., `select(*, categories(name))`).

### Security Note:
- The client-side Supabase calls (in pages and components) use the anon key and rely on Row Level Security (RLS) policies defined in the database (in supabase/schema.sql) to restrict access.
- Server-side routes (like `/api/checkout` and `/api/webhooks/paystack`) use the service role key (via `getSupabaseAdmin`) to bypass RLS for trusted operations.

## 2. Authentication

### Used in:
- `app/auth/login/page.tsx`: `supabase.auth.signInWithPassword({email, password})`
- `app/auth/signup/page.tsx`: `supabase.auth.signUp({email, password})` followed by profile creation.
- `app/auth/*`: Also uses `supabase.auth.getUser()` to check the current session (in layout.tsx? Actually, we see it in many client-side components to get the user).
- `app/admin/layout.tsx`: Uses `supabase.auth.getUser()` via the `AdminGuard` component to check if the user is an admin.
- `app/admin/customers/page.tsx`: Uses `supabaseAdmin.auth.admin.listUsers()` to list all users (server-side, service role).

### Notes:
- Authentication is handled entirely by Supabase Auth (email/password).
- The `profiles` table is populated via a trigger in the schema (see supabase/schema.sql) or manually in the signup page (the signup page does an upsert to profiles after signUp).
- The `AdminGuard` component checks the user's role from the `profiles` table to gate admin routes.

## 3. Storage

### Used in:
- `app/admin/products/new/page.tsx`: Uploads an image to the `product-images` bucket and gets the public URL.
- `app/admin/products/edit/[id]/page.tsx`: (Presumably similar to new, though we didn't see the upload in the edit page we read; but likely the same pattern).
- `app/admin/categories/new/page.tsx`: Uploads an image to the `category-images` bucket and gets the public URL.
- `app/admin/categories/edit/[id]/page.tsx`: (Similarly, likely uploads image).

### Patterns:
1. **Upload**: `supabase.storage.from("bucket").upload(fileName, file)`
2. **Get Public URL**: `supabase.storage.from("bucket").getPublicUrl(fileName)`

### Note:
- The buckets `product-images` and `category-images` are assumed to exist and be public (as per SETUP.md).

## Summary of Supabase Dependencies:

1. **Database**: All CRUD operations, queries, and relations.
2. **Authentication**: User sign-up, sign-in, session management, and user retrieval.
3. **Storage**: Uploading and retrieving images for products and categories.

## Migration Implications:

To migrate to Neon PostgreSQL, we will need to replace:

1. The Supabase client (`@supabase/supabase-js`) with a PostgreSQL client (e.g., `pg` or an ORM like Prisma).
2. The authentication system with a Cloudflare-compatible alternative (e.g., Auth.js, or custom session management with cookies/JWT and a users table in Neon).
3. The storage system with Cloudflare R2 (for raw asset storage) and/or Cloudflare Images (for image optimization and delivery).

The database schema will need to be recreated in Neon, potentially enhanced to support the full commerce domain (as per the specification).

The server-side logic (in route.ts files and lib files) will need to be updated to use the new database client.

The client-side code that currently uses `supabase` directly (for auth, database, storage) will need to be updated to call our own API routes (which will then use the new database/storage/auth services) or, alternatively, we can adopt a pattern where the client talks to our own backend (Next.js API routes) which then talks to Neon and Cloudflare services.

Given the requirement to move to Cloudflare Workers + Next.js, we should aim to have all data access go through our own API routes (or Server Actions) which then use the Neon database and Cloudflare storage. This way, the client does not need to know about the underlying services, and we can keep the Supabase dependency out of the client bundle.

However, note that the current codebase has a mix of direct Supabase calls in client components and pages. We will need to refactor those to use our own API endpoints or Server Actions.

This document will serve as the basis for designing the replacement architecture.