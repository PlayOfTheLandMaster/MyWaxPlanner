// Insights: what the history says about each wax. Pure, so it is testable;
// the page loads the sessions. A session's rating counts for every wax in
// that zone (cleaning aside), because a prep is judged as a whole.

export type InsightSession = {
  id: string;
  technique: "classic" | "skate";
  snow_temp_c: number | null;
  glide_rating: number | null;
  grip_rating: number | null;
  /** The waxes used, cleaning left out, by zone. */
  waxes: { zone: "glide" | "grip"; name: string }[];
};

export type Zone = "glide" | "grip";

export type WaxPoint = { session: string; temp: number; rating: number };
export type WaxSpread = { name: string; points: WaxPoint[]; average: number };
export type Band = { key: string; label: string; min: number; max: number };
export type BandBest = { band: Band; name: string; average: number; sessions: number } | { band: Band; name: null };
export type Usage = { name: string; sessions: number };

/** Snow temperature bands, coldest first. min is inclusive, max exclusive. */
export const BANDS: Band[] = [
  { key: "cold", label: "Colder than −15 °C", min: -Infinity, max: -15 },
  { key: "c15", label: "−15 to −8 °C", min: -15, max: -8 },
  { key: "c8", label: "−8 to −3 °C", min: -8, max: -3 },
  { key: "c3", label: "−3 to 0 °C", min: -3, max: 0 },
  { key: "zero", label: "0 °C (wet snow)", min: 0, max: Infinity },
];

/** Enough rated sessions with a snow temperature for the charts to mean something. */
export const ENOUGH = 3;

export function ratingFor(s: InsightSession, zone: Zone): number | null {
  return zone === "glide" ? s.glide_rating : s.technique === "classic" ? s.grip_rating : null;
}

/** Sessions that can be placed on a chart: rated in this zone, with a snow temperature. */
export function rated(sessions: InsightSession[], zone: Zone): InsightSession[] {
  return sessions.filter((s) => ratingFor(s, zone) !== null && s.snow_temp_c !== null && s.waxes.some((w) => w.zone === zone));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Each wax's ratings across snow temperatures, most-rated first; at most `limit` waxes. */
export function spreads(sessions: InsightSession[], zone: Zone, limit = 8): WaxSpread[] {
  const by = new Map<string, WaxPoint[]>();
  for (const s of rated(sessions, zone)) {
    for (const name of new Set(s.waxes.filter((w) => w.zone === zone).map((w) => w.name))) {
      const list = by.get(name) ?? [];
      list.push({ session: s.id, temp: Number(s.snow_temp_c), rating: ratingFor(s, zone)! });
      by.set(name, list);
    }
  }
  return [...by.entries()]
    .map(([name, points]) => ({
      name,
      points: points.sort((a, b) => a.temp - b.temp),
      average: round1(points.reduce((t, p) => t + p.rating, 0) / points.length),
    }))
    .sort((a, b) => b.points.length - a.points.length || b.average - a.average || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function bandOf(temp: number): Band {
  return BANDS.find((b) => temp >= b.min && temp < b.max)!;
}

/**
 * The best-rated wax in each temperature band. Ties go to the wax rated more
 * often, then by name, so the answer never flickers between visits.
 */
export function bestByBand(sessions: InsightSession[], zone: Zone): BandBest[] {
  const list = rated(sessions, zone);
  return BANDS.map((band) => {
    const inBand = list.filter((s) => bandOf(Number(s.snow_temp_c)).key === band.key);
    const by = new Map<string, number[]>();
    for (const s of inBand) {
      for (const name of new Set(s.waxes.filter((w) => w.zone === zone).map((w) => w.name))) {
        by.set(name, [...(by.get(name) ?? []), ratingFor(s, zone)!]);
      }
    }
    const ranked = [...by.entries()]
      .map(([name, r]) => ({ name, average: round1(r.reduce((a, b) => a + b, 0) / r.length), sessions: r.length }))
      .sort((a, b) => b.average - a.average || b.sessions - a.sessions || a.name.localeCompare(b.name));
    return ranked[0] ? { band, ...ranked[0] } : { band, name: null };
  });
}

/** How many sessions used each wax in this zone, rated or not; most used first. */
export function usage(sessions: InsightSession[], zone: Zone, limit = 10): Usage[] {
  const by = new Map<string, number>();
  for (const s of sessions) {
    for (const name of new Set(s.waxes.filter((w) => w.zone === zone).map((w) => w.name))) {
      by.set(name, (by.get(name) ?? 0) + 1);
    }
  }
  return [...by.entries()]
    .map(([name, n]) => ({ name, sessions: n }))
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** The temperature axis: whole degrees, padded, always including 0 when near it. */
export function tempDomain(spread: WaxSpread[]): [number, number] {
  const temps = spread.flatMap((w) => w.points.map((p) => p.temp));
  if (temps.length === 0) return [-20, 5];
  let lo = Math.floor(Math.min(...temps)) - 2;
  let hi = Math.ceil(Math.max(...temps)) + 2;
  if (hi < 2 && hi > -6) hi = 2;
  if (hi - lo < 10) lo = hi - 10;
  return [lo, hi];
}
