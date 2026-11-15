import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user, or null. Uses getUser(), which checks the token with
 * Supabase, rather than getSession(), which trusts the cookie as written.
 * Wrapped in cache() so a layout and its page share one check per request.
 */
export const currentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});
