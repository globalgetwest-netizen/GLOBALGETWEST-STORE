# GLOBALGETWEST-STORE — Phase 3: Authentication

Sign up, sign in, sign out, account overview, order history. Fills the gap
Phase 2 called out (cart/checkout redirecting to a sign-in page that didn't
exist yet).

## What's in here

```
app/account/sign-up/page.tsx     Email/password sign up
app/account/sign-in/page.tsx     Email/password sign in
app/account/page.tsx             Account overview + role-based links to staff/admin portals
app/account/orders/page.tsx      Order history
app/account/sign-out/route.ts    Sign-out handler
app/auth/callback/route.ts       Handles email confirmation link redirects
lib/supabase/client.ts           Browser-side Supabase client
components/Header.tsx            Updated — now reflects real auth state (was static before)
supabase/migrations/003_auto_create_profile.sql   Auto-creates a 'customer' profile on signup
```

## How role assignment works

Every new signup becomes a `customer` automatically — there's no self-serve
staff/admin signup path, on purpose. To make your own account an admin after
signing up normally:

```sql
update profiles set role = 'admin' where id = '<your-auth-user-id>';
```

Find your user id in Supabase Dashboard → Authentication → Users. Once
you're admin, the account page shows a link to the admin portal (Phase 4) —
staff role assignment after that can happen from inside the admin portal
itself rather than the SQL editor.

## Setup needed

1. Run `supabase/migrations/003_auto_create_profile.sql`.
2. In Supabase Dashboard → Authentication → URL Configuration, set the site
   URL to `https://globalgetwest.com` (or `http://localhost:3000` for local
   dev) and add `/auth/callback` to the redirect allow-list.
3. Decide whether you want email confirmation required before sign-in
   (Authentication → Providers → Email → "Confirm email"). Phase 3's sign-up
   page handles both cases (shows a "check your email" screen if
   confirmation is required, otherwise signs the user in immediately).

## Not yet built (next phases)

- Admin portal
- Staff portal
