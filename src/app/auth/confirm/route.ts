// Where the "confirm your email" link lands. Supabase sends either a one-time
// `code` (the default PKCE flow) or a `token_hash` (if the email template is
// customised to send one); both are exchanged for a session here.

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  // Always land on a fixed path: a `next=` parameter taken from the link
  // would let anyone build a link that signs you in and sends you elsewhere.
  return NextResponse.redirect(new URL(ok ? "/" : "/login?error=link", url.origin));
}
