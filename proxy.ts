import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Keeps organiser sign-in sessions fresh. Supabase Auth tokens expire hourly; this refreshes
 * them before organiser pages render and writes the new cookies back on the response.
 * Includes /projector and its data feeds. Agency (phone) pages do not use Supabase Auth and are not matched.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // /projector and the screens' data feeds poll for hours: their sign-in must be refreshed too,
  // or the projector freezes when the hourly token expires.
  matcher: ['/admin/:path*', '/screen/:path*', '/auth/:path*', '/projector/:path*', '/api/screen/:path*'],
};
