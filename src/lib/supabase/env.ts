// The public half of the Supabase configuration. Both values ship in the
// browser bundle, which is fine: the publishable (anon) key can do only what
// Row Level Security allows a signed-in user to do.

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set (see README: Set up)");
  return url;
}

export function supabasePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set (see README: Set up)");
  return key;
}
