// Which unrated sessions Today lists, and under which heading. A session is
// "planned" until it is rated; Today used to show only one of them, the
// earliest of the last three hours, which hid two active sessions behind one
// that only needed rating. The heading follows the session page's own stage
// (stageOf), so the two pages never disagree. Pure, so it can be tested.

import { stageOf as sessionStage } from "@/lib/history/stage";

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

/** How many "Completed ski - how did it go?" rows Today shows before "and N more". */
export const RATE_ROWS = 3;

export type TodaySessions = {
  /** Waxing or skiing: earliest first. */
  active: OpenSession[];
  /** Marked Done, or past its skiing hours: newest first, at most RATE_ROWS. */
  toRate: OpenSession[];
  /** The rest of toRate, counted for "and N more". */
  moreToRate: number;
};

export function sortOpenSessions(rows: OpenSession[], now: Date): TodaySessions {
  const active: OpenSession[] = [];
  const rate: OpenSession[] = [];
  for (const r of rows) {
    if (sessionStage({ ...r, status: "planned" }, now) === "rate") rate.push(r);
    else active.push(r);
  }
  active.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  rate.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return { active, toRate: rate.slice(0, RATE_ROWS), moreToRate: Math.max(0, rate.length - RATE_ROWS) };
}

/** Where an active session is at, in the words on its row. */
export function stageLabel(s: Pick<OpenSession, "waxed_at" | "occurred_at">, now: Date): string {
  if (now.getTime() >= Date.parse(s.occurred_at)) return "Skiing now";
  return s.waxed_at ? "Waxed — ready to ski" : "Not waxed yet";
}
