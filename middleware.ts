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
  // client construction above.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on every route except static assets and image optimization files,
    // where there's no session to refresh and no benefit to the overhead.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
