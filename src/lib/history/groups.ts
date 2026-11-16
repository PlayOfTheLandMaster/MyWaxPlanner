// Splitting the Session tab's planned sessions: today's and later ones are
// current; ones marked Done, or from an earlier day, are skied and unrated. Pure, so it
// is testable; "today" is the reader's, in their own time zone.

/** A moment's calendar day in a time zone, as 2026-11-16 (sorts as text). */
export function dayIn(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof iso === "string" ? new Date(iso) : iso,
  );
}

export function splitByDay<T extends { occurred_at: string; done_at?: string | null }>(
  rows: T[],
  now: Date,
  timeZone: string,
): { current: T[]; unrated: T[] } {
  const today = dayIn(now, timeZone);
  const isUnrated = (r: T) => Boolean(r.done_at) || dayIn(r.occurred_at, timeZone) < today;
  const current = rows.filter((r) => !isUnrated(r));
  const unrated = rows.filter(isUnrated);
  // Current: soonest first. Unrated: most recent first.
  current.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  unrated.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return { current, unrated };
}
