// Which unrated sessions Today lists, and under which heading. A session is
// "planned" until it is rated; Today used to show only one of them, the
// earliest of the last three hours, which hid two active sessions behind one
// that only needed rating. Pure, so it can be tested.

export type OpenSession = {
  id: string;
  occurred_at: string;
  technique: "classic" | "skate";
  mode: "recreational" | "race";
  venue_name: string | null;
  event_name: string | null;
  waxed_at: string | null;
  done_at: string | null;
};

/** A session not marked Done this long after its start is assumed skied, and asked to be rated. */
export const STALE_HOURS = 12;

/** How many "How did it go?" rows Today shows before "and N more". */
export const RATE_ROWS = 3;

export type TodaySessions = {
  /** Not marked Done, and recent: earliest first. */
  active: OpenSession[];
  /** Marked Done, or long past: newest first, at most RATE_ROWS. */
  toRate: OpenSession[];
  /** The rest of toRate, counted for "and N more". */
  moreToRate: number;
};

export function sortOpenSessions(rows: OpenSession[], now: Date): TodaySessions {
  const stale = now.getTime() - STALE_HOURS * 3600_000;
  const active: OpenSession[] = [];
  const rate: OpenSession[] = [];
  for (const r of rows) {
    if (!r.done_at && new Date(r.occurred_at).getTime() > stale) active.push(r);
    else rate.push(r);
  }
  active.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  rate.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return { active, toRate: rate.slice(0, RATE_ROWS), moreToRate: Math.max(0, rate.length - RATE_ROWS) };
}

/** Where an active session is at, in the words on its row. */
export function stageOf(s: Pick<OpenSession, "waxed_at">): string {
  return s.waxed_at ? "Waxed — ready to ski" : "Not waxed yet";
}
