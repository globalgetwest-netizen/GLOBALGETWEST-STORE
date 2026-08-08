# Global Get West Store — Setup & Go-Live Guide

Next.js 16 + Supabase + Paystack (cards + mobile money) e-commerce store.

---

## What you need
- A **Supabase** project (free) — database + auth + storage.
- A **Paystack** account (Ghana) — payments. Test keys are fine to start.
- **Node 20+** and this repo.

---

## 1. Supabase — database, security, storage
1. Create a project at **supabase.com**.
2. **SQL Editor → New query** → paste all of **`supabase/schema.sql`** → **Run**.
   This creates every table (`profiles`, `categories`, `products`, `carts`,
   `orders`, `order_items`), the security policies (RLS), and the auto-profile
   trigger.
3. **Storage → New bucket** → name it **`product-images`** → make it **Public**.
   (Product & category images are uploaded here.)
4. **Make yourself an admin.** After you sign up in the app once, run in SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
5. *(Optional, easier testing)* **Authentication → Providers → Email** → turn
   **off** "Confirm email" so signups are instant. (The profile trigger works
   either way.)

Get your keys from **Project Settings → API**: Project URL, `anon` key, and the
`service_role` key.

---

## 2. Paystack — payments
1. Sign up at **paystack.com** (Ghana business).
2. **Settings → API Keys & Webhooks** → copy your **Secret key** (`sk_test_…`)
   and **Public key** (`pk_test_…`).
3. Set the **Webhook URL** (after you deploy, step 5) to:
   ```
   https://YOUR-DOMAIN/api/webhooks/paystack
   ```
   This is what confirms payments server-to-server.

---

## 3. Environment variables
Copy `.env.example` → `.env.local` and fill it in:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # server-only, keep secret
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 4. Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000 . Admin panel is at **/admin** (must be signed in as
an admin — see step 1.4).

---

## 5. Deploy to Vercel
1. Push this repo to GitHub, then **vercel.com → New Project → import it**.
2. Add the **same environment variables** from step 3 in Vercel
   (Project → Settings → Environment Variables).
   - Set **`NEXT_PUBLIC_SITE_URL`** to your Vercel URL, e.g.
     `https://globalgetwest-store.vercel.app`.
3. **Deploy.**
4. Back in **Paystack → Webhooks**, set the Webhook URL to
   `https://YOUR-VERCEL-URL/api/webhooks/paystack`.

---

## 6. How checkout works (so you can test it)
1. Customer adds items → **Cart → Place order**.
2. Server creates a **Pending** order and redirects to **Paystack** (card or
   mobile money).
3. On success, Paystack sends the buyer back to **`/checkout/callback`** (which
   verifies the payment) **and** calls the **webhook** — either one marks the
   order **Paid**, reduces stock, and clears the cart. (It's idempotent, so
   running both is safe.)
4. The order shows in the customer's **/account** and in **/admin/orders**.

**Test card (Paystack test mode):** `4084 0840 8408 4081`, any future expiry,
CVV `408`, OTP `123456`.

---

## 7. Going live
- Complete **Paystack business verification**, then swap the **test** keys
  (`sk_test_…` / `pk_test_…`) for your **live** keys in Vercel env vars.
- Double-check the webhook URL points at your production domain.
- Do one small **real** transaction end-to-end before announcing.
