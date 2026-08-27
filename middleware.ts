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

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  // Touching getUser() is what actually triggers the refresh-if-needed
  // logic inside the Supabase client — this call matters, not just the
  // client construction above. Wrapped so a slow/failed auth check (network
  // hiccup, brief Supabase latency) degrades to "treat as signed out for
  // this one request" rather than timing out the entire page — the page's
  // own supabaseServerClient() call still gets a real chance to succeed.
  try {
    await supabase.auth.getUser();
  } catch (err) {
    console.error('Middleware session refresh failed, continuing without it:', err);
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
    // pure redundant overhead: an extra Supabase Auth round-trip on every
    // API call for no benefit, including on the checkout path where a slow
    // network moment turned into a full request timeout.
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
