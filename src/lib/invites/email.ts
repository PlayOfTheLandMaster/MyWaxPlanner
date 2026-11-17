// Sign-up is by invitation: an admin adds an email address, and only that
// address can create an account. The database enforces it (the
// require_signup_invite trigger on auth.users); this is the app's half.

/** An address as invitations store it: trimmed and lower-case, or null if it is not one. */
export function inviteEmail(raw: unknown): string | null {
  const e = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/**
 * Supabase reports a sign-up the database refused as "Database error saving
 * new user", with no detail. Without an invitation, that is the reason.
 */
export function isRefusedSignUp(message: string): boolean {
  return /database error saving new user/i.test(message);
}

export const NOT_INVITED =
  "This app is by invitation for now, and that email address isn’t on the list. Use the address your invitation went to, or ask the person who invited you to add this one.";
