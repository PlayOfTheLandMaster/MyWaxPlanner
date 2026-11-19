// "Wax jobs like today": past wax jobs whose snow was very close to today's,
// grouped by where they were skied. Today is the skier's own check when they
// have saved one for today, else the forecast's estimate. Pure, so it can be
// tested; the page does the reading.

/** Snow within this many degrees counts as very similar. */
export const CLOSE_C = 2;

export type Today = { snow_temp_c: number; snow_humidity_band: string; snow_type: string | null };

export type PastJob = {
  id: string;
  occurred_at: string;
  venue_id: string | null;
  venue_name: string | null;
  snow_temp_c: number | null;
  snow_humidity_band: string | null;
  snow_type: string | null;
  glide_rating: number | null;
};

export type Match<T extends PastJob> = T & { degreesOff: number; sameSnowType: boolean };
export type Group<T extends PastJob> = { key: string; name: string; jobs: Match<T>[] };

/** The database's half of the question: snow temperature and snowball result. */
export function likeTodayRange(today: Today): { tmin: number; tmax: number; snowhum: string } {
  return {
    tmin: Math.max(-40, today.snow_temp_c - CLOSE_C),
    tmax: Math.min(0, today.snow_temp_c + CLOSE_C),
    snowhum: today.snow_humidity_band,
  };
}

/**
 * The matches, one group per location. Closest snow first, a different snow
 * type counting as one degree further, then the best glide, then the newest. A location's
 * place in the list is set by its best match; wax jobs with no location come last.
 */
export function likeToday<T extends PastJob>(jobs: T[], today: Today): Group<T>[] {
  const matches: Match<T>[] = [];
  for (const j of jobs) {
    if (j.snow_temp_c === null || j.snow_humidity_band !== today.snow_humidity_band) continue;
    const degreesOff = Math.round(Math.abs(j.snow_temp_c - today.snow_temp_c) * 10) / 10;
    if (degreesOff > CLOSE_C) continue;
    matches.push({ ...j, degreesOff, sameSnowType: !!today.snow_type && j.snow_type === today.snow_type });
  }
  const closeness = (m: Match<T>) => m.degreesOff + (m.sameSnowType ? 0 : 1);
  matches.sort(
    (a, b) =>
      closeness(a) - closeness(b) ||
      (b.glide_rating ?? 0) - (a.glide_rating ?? 0) ||
      b.occurred_at.localeCompare(a.occurred_at),
  );
  const groups = new Map<string, Group<T>>();
  for (const m of matches) {
    const key = m.venue_id ?? (m.venue_name ? `name:${m.venue_name}` : "none");
    if (!groups.has(key)) groups.set(key, { key, name: m.venue_name ?? "No location recorded", jobs: [] });
    groups.get(key)!.jobs.push(m);
  }
  // Insertion order is already best match first; only the no-location group moves.
  const list = [...groups.values()];
  return [...list.filter((g) => g.key !== "none"), ...list.filter((g) => g.key === "none")];
}
