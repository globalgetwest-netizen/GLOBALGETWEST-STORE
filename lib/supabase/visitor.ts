// lib/supabase/visitor.ts
// Lets visitors shop without creating an account. The first time someone
// adds to cart, they get a silent Supabase "anonymous" session — no form,
// nothing shown to them — so the cart, RLS policies, orders and payments all
// keep working exactly as they do for registered customers.
//
// Requires "Allow anonymous sign-ins" in Supabase → Authentication →
// Sign In / Providers. If that's off, this returns null and callers fall
// back to the old behaviour (send the visitor to sign in).
import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function getOrCreateVisitor(supabase: SupabaseClient): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('Anonymous sign-in failed (is it enabled in Supabase?):', error.message);
    return null;
  }
  return data.user;
}

/** A guest shopper — has a cart and orders, but no email/password yet. */
export function isGuest(user: User | null | undefined): boolean {
  return !!user?.is_anonymous;
}
