// Next 16 calls this file `proxy.ts` (it was `middleware.ts`). It only keeps
// the Supabase session cookie fresh. It does NOT protect pages: that happens
// in src/app/(app)/layout.tsx, and the data itself is protected by Row Level
// Security, which is the real enforcement.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes an expired access token. Must run before anything renders.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Skip static files and images; everything else may need a fresh session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
