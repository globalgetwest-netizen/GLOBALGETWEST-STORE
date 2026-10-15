-- Guest checkout: shoppers can buy without creating an account (they get a
-- silent Supabase anonymous session — see lib/supabase/visitor.ts). Guests
-- have no email on their auth user, so the email they type at checkout is
-- stored on the order itself, for receipts and for staff to contact them.
--
-- Run this in Supabase's SQL Editor BEFORE deploying the guest-checkout code,
-- and turn on Authentication → Sign In / Providers → "Allow anonymous sign-ins".

alter table orders add column if not exists contact_email text;
