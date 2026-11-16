// Which pairs a session form offers: only the skis of the person the session
// is for, so waxing for yourself never lists another skier's pairs. Pure.

/** The pairs belonging to `owner` (a skier id, or null for the account holder). */
export function skisOf<T extends { skier_id: string | null }>(skis: T[], owner: string | null): T[] {
  return skis.filter((k) => k.skier_id === owner);
}

/**
 * Whose skis a session form should show: the owner of the session's pair if it
 * has one (a pair says whose it is), else the session's own skier, else the
 * skier picked on Today.
 */
export function formOwner(
  skis: { id: string; skier_id: string | null }[],
  session: { ski_id: string | null; skier_id: string | null } | null,
  picked: string | null,
): string | null {
  const pair = session?.ski_id ? skis.find((k) => k.id === session.ski_id) : undefined;
  if (pair) return pair.skier_id;
  if (session) return session.skier_id;
  return picked;
}
