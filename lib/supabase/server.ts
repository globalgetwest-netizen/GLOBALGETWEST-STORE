// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Every server-side Supabase call was previously unbounded — if Supabase's
// connection had any slow moment, a page would hang until Vercel's own
// hard function limit (25s) killed it outright, producing exactly the
// 504 "did not return an initial response within 25s" errors seen across
// /, /products, /admin, /account/sign-in, and more. Wrapping every client's
// fetch with an explicit abort means a slow Supabase response fails fast
// and visibly (a real error the page can catch) instead of hanging the
// entire request to the platform's hard limit.
function fetchWithTimeout(timeoutMs: number) {
  return (url: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}

/**
 * Service-role client — bypasses RLS. Use ONLY in trusted server contexts:
 * webhook handlers, admin cron jobs. Never expose this client or key to
 * the browser.
 */
export function supabaseServiceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: fetchWithTimeout(8000) } },
  );
}

/**
 * Request-scoped client that respects the signed-in user's session and RLS.
 * Use this in server components, route handlers, and server actions that
 * act on behalf of the logged-in user (customer, staff, or admin).
 */
export async function supabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchWithTimeout(8000) },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Expected and safe to ignore: this fires when called from a
            // plain Server Component (a page, not a Route Handler/Server
            // Action), which cannot write cookies. The middleware.ts file
            // is what actually handles session-cookie refresh in that
            // case — this catch just stops the harmless attempt from
            // Server Components from crashing the page.
          }
        },
      },
    },
  );
}
