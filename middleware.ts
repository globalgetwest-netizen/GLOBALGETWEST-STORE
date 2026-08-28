// middleware.ts
// Supabase's session tokens need refreshing periodically. Route Handlers and
// Server Actions can write cookies directly, but plain Server Components
// (regular pages) cannot — that's what caused the "Cookies can only be
// modified in a Server Action or Route Handler" error. Middleware runs
// before any page renders and CAN write cookies on the outgoing response,
// so it's the correct place for Supabase's session refresh to happen. This
// is Supabase's own documented pattern for Next.js App Router, not a
// workaround.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// A try/catch alone doesn't protect against this: if Supabase's Auth
// endpoint simply hangs rather than erroring, the request never rejects,
// so the catch block never runs — Vercel's own platform-level execution
// timeout kills the whole middleware first, which is what produced the
// 504 MIDDLEWARE_INVOCATION_TIMEOUT on the sign-in page. This wraps fetch
// with an explicit, short abort so we always give up well before Vercel's
// own harder limit — a slow/hanging auth check degrades to "treat as
// signed out for this one request" instead of timing out the entire page.
function fetchWithTimeout(timeoutMs: number) {
  return (url: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchWithTimeout(4000) },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    await supabase.auth.getUser();
  } catch (err) {
    console.error('Middleware session refresh failed or timed out, continuing without it:', err);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on pages (Server Components), which genuinely need this — they
    // can't write cookies themselves, so this middleware is what refreshes
    // their session. Excludes static assets, AND excludes /api/* — Route
    // Handlers can write cookies directly and already refresh their own
    // session via supabaseServerClient(), so running this here too was
    // pure redundant overhead.
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
