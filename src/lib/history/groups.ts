// Splitting the Session tab's planned sessions: today's and later ones are
// current; ones from an earlier day were skied and never rated. Pure, so it
// is testable; "today" is the reader's, in their own time zone.

/** A moment's calendar day in a time zone, as 2026-11-16 (sorts as text). */
export function dayIn(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof iso === "string" ? new Date(iso) : iso,
  );
}

export function splitByDay<T extends { occurred_at: string }>(
  rows: T[],
  now: Date,
  timeZone: string,
): { current: T[]; unrated: T[] } {
  const today = dayIn(now, timeZone);
  const current = rows.filter((r) => dayIn(r.occurred_at, timeZone) >= today);
  const unrated = rows.filter((r) => dayIn(r.occurred_at, timeZone) < today);
  // Current: soonest first. Unrated: most recent first.
  current.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  unrated.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return { current, unrated };
}
