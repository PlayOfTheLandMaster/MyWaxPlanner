// Supabase client for Client Components. Runs under Row Level Security as the
// signed-in user.

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
