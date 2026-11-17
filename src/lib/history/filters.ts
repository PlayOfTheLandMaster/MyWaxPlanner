// The History screen's filters live in the address bar (?technique=skate&glide=4),
// so a filtered view can be bookmarked, shared with yourself, or saved by name.
// This reads them, describes them as chips, and turns them back into a link.

import { HUMIDITY_BANDS, SNOW_TYPES } from "@/lib/catalogue/vocab";
import { TECHNIQUES } from "@/lib/skis/input";
import { KICK_FEELS, MODES, STATUSES } from "./vocab";

export const SORTS = ["date", "glide", "grip", "snow_temp"] as const;
export type Sort = (typeof SORTS)[number];

export type Filters = {
  /** "season" (this season), "30d", "all", or a season such as "2025-26". */
  period: string;
  technique?: string;
  /**
   * "me" (the account holder), "all", or one of the account's skiers. Unset
   * means the skier picked on Today.
   */
  skier?: string;
  ski?: string;
  venue?: string;
  mode?: string;
  status?: string;
  snow?: string;
  snowhum?: string;
  airhum?: string;
  brand?: string;
  product?: string;
  glide?: number;
  grip?: number;
  kick?: string;
  tmin?: number;
  tmax?: number;
  q?: string;
  sort: Sort;
};

type Params = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const pick = (list: readonly string[], v: string | undefined) => (v && list.includes(v) ? v : undefined);
const uuid = (v: string | undefined) => (v && UUID.test(v) ? v : undefined);
const numberIn = (v: string | undefined, min: number, max: number) => {
  if (v === undefined) return undefined;
  const n = Number(v.replace("−", "-"));
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

/** August: the season start for an account that has not chosen one. */
export const DEFAULT_SEASON_START = 8;

/** A month 1–12, or the default. */
export function seasonStart(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : DEFAULT_SEASON_START;
}

/**
 * A season runs for 12 months from the account's start month (August unless
 * changed on Account) and is named by the year it starts in and the next:
 * with an August start, November 2026 is in "2026-27".
 */
export function seasonOf(date: Date, startMonth = DEFAULT_SEASON_START): string {
  const y = date.getUTCFullYear();
  const start = date.getUTCMonth() + 1 >= startMonth ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function seasonRange(season: string, startMonth = DEFAULT_SEASON_START): { from: string; to: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(season);
  if (!m) return null;
  const start = Number(m[1]);
  if (String((start + 1) % 100).padStart(2, "0") !== m[2]) return null;
  const mm = String(startMonth).padStart(2, "0");
  return { from: `${start}-${mm}-01T00:00:00Z`, to: `${start + 1}-${mm}-01T00:00:00Z` };
}

/** "2026–27", or "2026" when the season starts in January and stays in one year. */
export function seasonLabel(season: string, startMonth = DEFAULT_SEASON_START): string {
  return startMonth === 1 ? season.slice(0, 4) : season.replace("-", "–");
}

export function parseFilters(params: Params): Filters {
  const p = (k: string) => first(params[k]);
  const period = p("period");
  return {
    period: period === "30d" || period === "all" || (period && seasonRange(period)) ? period : "season",
    technique: pick(TECHNIQUES, p("technique")),
    skier: p("skier") === "me" || p("skier") === "all" ? p("skier") : uuid(p("skier")),
    ski: uuid(p("ski")),
    venue: uuid(p("venue")),
    mode: pick(MODES, p("mode")),
    status: pick(STATUSES, p("status")),
    snow: pick(SNOW_TYPES, p("snow")),
    snowhum: pick(HUMIDITY_BANDS, p("snowhum")),
    airhum: pick(HUMIDITY_BANDS, p("airhum")),
    brand: p("brand")?.slice(0, 60),
    product: uuid(p("product")),
    glide: numberIn(p("glide"), 1, 5),
    grip: numberIn(p("grip"), 1, 5),
    kick: pick(KICK_FEELS, p("kick")),
    tmin: numberIn(p("tmin"), -40, 0),
    tmax: numberIn(p("tmax"), -40, 0),
    q: p("q")?.slice(0, 80),
    sort: (pick(SORTS, p("sort")) as Sort | undefined) ?? "date",
  };
}

/** The filters as a query string, leaving out defaults. */
export function toQuery(f: Filters, change: Partial<Filters> = {}): string {
  const merged = { ...f, ...change };
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === "") continue;
    if (k === "period" && v === "season") continue;
    if (k === "sort" && v === "date") continue;
    out.set(k, String(v));
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

/** The date range a period covers, or null for all time. */
export function periodRange(
  period: string,
  now: Date,
  startMonth = DEFAULT_SEASON_START,
): { from?: string; to?: string } | null {
  if (period === "all") return null;
  if (period === "30d") return { from: new Date(now.getTime() - 30 * 86_400_000).toISOString() };
  return seasonRange(period === "season" ? seasonOf(now, startMonth) : period, startMonth);
}

/** How many filters are set, not counting the period and the sort. */
export function activeCount(f: Filters): number {
  return Object.entries(f).filter(([k, v]) => k !== "period" && k !== "sort" && v !== undefined && v !== "").length;
}

/** Recent seasons to offer in the period list, newest first. */
export function recentSeasons(now: Date, count = 5, startMonth = DEFAULT_SEASON_START): string[] {
  const start = Number(seasonOf(now, startMonth).slice(0, 4));
  return Array.from({ length: count }, (_, i) => `${start - i}-${String((start - i + 1) % 100).padStart(2, "0")}`);
}
