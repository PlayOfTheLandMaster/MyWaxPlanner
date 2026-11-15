import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Runs under Row Level Security as the signed-in user. Create one per request.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A Server Component cannot set cookies. That is fine: src/proxy.ts
          // refreshes the session on every request before rendering starts.
        }
      },
    },
  });
}

/**
 * Supabase client with the secret (service role) key. BYPASSES Row Level
 * Security entirely — every query through it must restrict ownership itself.
 * For jobs with no signed-in user. Nothing in the app uses it yet.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createPlainClient(supabaseUrl(), key, { auth: { persistSession: false } });
}
