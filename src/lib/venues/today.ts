// Today's location: the venue every wax job today uses — Today's forecast and
// snow check, Plan a wax and Record a wax job. Set on Today; it starts each
// day as the home venue and lasts until the end of that day (the reader's own
// day), so a morning at Canmore and an afternoon at Shark Mountain is one tap.
// Pure, so it can be tested.

export type TodayVenue = { venue_id: string; day: string };

/** The stored choice, or null if missing or damaged. */
export function readTodayVenue(v: unknown): TodayVenue | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.venue_id !== "string" || typeof o.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.day)) return null;
  return { venue_id: o.venue_id, day: o.day };
}

/** The venue for today: the one picked today, else the home venue. */
export function todayVenueId(picked: TodayVenue | null, home: string | null, today: string): string | null {
  return picked && picked.day === today ? picked.venue_id : home;
}

/** A date as "2026-11-17" in a time zone. */
export function dayIn(now: Date, timeZone: string): string {
  return now.toLocaleDateString("en-CA", { timeZone });
}
