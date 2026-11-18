// The forecast for where and when you will ski: a venue's coordinates and
// elevation, and the hours you will be on the trail. Never the phone's own
// location, which may be in Calgary while the skiing is in Lake Louise.
//
// Data: Open-Meteo (https://open-meteo.com), free for non-commercial use with
// no key. Their terms ask for a paid plan for commercial use, so a paid
// version of this app needs an API key added here.

import {
  airHumidityBand,
  estimateSnowTemp,
  guessSnowHumidity,
  guessSnowType,
  type Hour,
} from "./snow";
import type { HumidityBand, SnowType } from "@/lib/catalogue/vocab";
import type { Sky } from "@/lib/history/vocab";
import { inProvince } from "@/lib/venues/search-area";

export type Venue = { id: string; name: string; latitude: number; longitude: number; elevation_m: number | null };

export type ForecastWindow = {
  venue: Venue;
  /** Venue-local start as given, "2026-11-15T09:03", and the exact moment it is. The hourly figures use the hour it falls in. */
  start: string;
  startIso: string;
  hours: Hour[]; // the session's hours
  utcOffsetSeconds: number;
  timezone: string;
  elevation_m: number; // what Open-Meteo used
  air_temp_c: number; // at the start
  air_temp_min_c: number;
  air_temp_max_c: number;
  overnight_low_c: number | null;
  air_rh_pct: number; // mean over the session
  air_humidity_band: HumidityBand;
  wind_kmh: number; // strongest
  new_snow_cm: number; // 24 h before the start
  snowfall_during_cm: number;
  sky: Sky;
  snow_temp_c: number; // estimate at the start
  snow_temp_range: [number, number]; // coldest and warmest over the session
  snow_humidity_band: HumidityBand; // estimate
  snow_type: SnowType; // estimate
};

const HOURLY = [
  "temperature_2m",
  "relative_humidity_2m",
  "snowfall",
  "rain",
  "cloud_cover",
  "wind_speed_10m",
  "weather_code",
  "is_day",
].join(",");

type OpenMeteo = {
  elevation: number;
  utc_offset_seconds: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    snowfall: (number | null)[];
    rain: (number | null)[];
    cloud_cover: (number | null)[];
    wind_speed_10m: (number | null)[];
    weather_code: (number | null)[];
    is_day: (number | null)[];
  };
};

export class ForecastError extends Error {}

/**
 * All forecast hours for a venue: two days back (or `pastDays`, up to the
 * weather service's 92, for a wax job recorded later) through six days ahead.
 */
export async function fetchHours(venue: Venue, pastDays = 2): Promise<{ hours: Hour[]; data: OpenMeteo }> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(venue.latitude));
  url.searchParams.set("longitude", String(venue.longitude));
  // The venue's own height, so a trail at 1,540 m is not forecast at the
  // average height of a mountain grid cell.
  if (venue.elevation_m !== null) url.searchParams.set("elevation", String(venue.elevation_m));
  url.searchParams.set("hourly", HOURLY);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("past_days", String(Math.min(92, Math.max(2, Math.ceil(pastDays)))));
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("wind_speed_unit", "kmh");

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch {
    throw new ForecastError("The weather service did not answer. Try again in a minute.");
  }
  if (!res.ok) throw new ForecastError(`The weather service refused the request (${res.status}).`);
  const data = (await res.json()) as OpenMeteo;
  const h = data.hourly;
  const hours: Hour[] = [];
  h.time.forEach((time, i) => {
    if (h.temperature_2m[i] === null) return;
    hours.push({
      time,
      temp_c: h.temperature_2m[i] as number,
      rh_pct: h.relative_humidity_2m[i] ?? 70,
      snowfall_cm: h.snowfall[i] ?? 0,
      rain_mm: h.rain[i] ?? 0,
      cloud_pct: h.cloud_cover[i] ?? 50,
      wind_kmh: h.wind_speed_10m[i] ?? 0,
      weather_code: h.weather_code[i] ?? 0,
      is_day: h.is_day[i] === 1,
    });
  });
  return { hours, data };
}

/** WMO weather codes to the sky words the app stores. */
export function skyOf(hours: Hour[]): Sky {
  const codes = hours.map((h) => h.weather_code);
  if (codes.some((c) => (c >= 71 && c <= 77) || c === 85 || c === 86)) return "snowing";
  if (codes.some((c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82))) return "raining";
  if (codes.some((c) => c === 45 || c === 48)) return "fog";
  const cloud = hours.reduce((s, h) => s + h.cloud_pct, 0) / hours.length;
  if (cloud < 25) return "sun";
  if (cloud < 70) return "partly_cloudy";
  return "overcast";
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Summarise the hours a session covers. `start` is venue-local time
 * ("2026-11-15T11:00"), as Open-Meteo labels its hours with timezone=auto.
 */
export function summarise(all: Hour[], venue: Venue, data: Pick<OpenMeteo, "utc_offset_seconds" | "timezone" | "elevation">, start: string, durationHours: number): ForecastWindow {
  const startHour = start.slice(0, 13) + ":00";
  const i = all.findIndex((h) => h.time === startHour);
  if (i < 0) throw new ForecastError("That time is outside the forecast, which covers the next six days.");
  const hours = all.slice(i, i + Math.max(1, durationHours));
  const before = (n: number) => all.slice(Math.max(0, i - n), i);

  // The coldest hour in the 12 before the start: the night the snow froze in.
  const night = before(12);
  const overnightLow = night.length ? Math.min(...night.map((h) => h.temp_c)) : null;
  const newSnow = round1(before(24).reduce((s, h) => s + h.snowfall_cm, 0));
  const rained = before(12).some((h) => h.rain_mm > 0.2) || hours.some((h) => h.rain_mm > 0.2);
  const maxTemp48h = Math.max(...before(48).map((h) => h.temp_c), hours[0].temp_c);

  const snowTemps = hours.map((h) => estimateSnowTemp(h, overnightLow));
  const rh = Math.round(hours.reduce((s, h) => s + h.rh_pct, 0) / hours.length);
  const snowTemp = snowTemps[0];
  const snowfallDuring = round1(hours.reduce((s, h) => s + h.snowfall_cm, 0));

  // Venue-local start to an exact moment, using the offset Open-Meteo reports.
  // The exact start the skier gave (minutes included), as a moment in time.
  const exact = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(start) ? start.slice(0, 16) : startHour;
  const [d, t] = exact.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const startIso = new Date(
    Date.UTC(y, mo - 1, da, Number(t.slice(0, 2)), Number(t.slice(3, 5))) - data.utc_offset_seconds * 1000,
  ).toISOString();

  return {
    venue,
    start: exact,
    startIso,
    hours,
    utcOffsetSeconds: data.utc_offset_seconds,
    timezone: data.timezone,
    elevation_m: Math.round(data.elevation),
    air_temp_c: round1(hours[0].temp_c),
    air_temp_min_c: round1(Math.min(...hours.map((h) => h.temp_c))),
    air_temp_max_c: round1(Math.max(...hours.map((h) => h.temp_c))),
    overnight_low_c: overnightLow === null ? null : round1(overnightLow),
    air_rh_pct: rh,
    air_humidity_band: airHumidityBand(rh),
    wind_kmh: round1(Math.max(...hours.map((h) => h.wind_kmh))),
    new_snow_cm: newSnow,
    snowfall_during_cm: snowfallDuring,
    sky: skyOf(hours),
    snow_temp_c: snowTemp,
    snow_temp_range: [Math.min(...snowTemps), Math.max(...snowTemps)],
    snow_humidity_band: guessSnowHumidity(snowTemp, rh, rained),
    snow_type: guessSnowType({
      newSnow24h: newSnow,
      fallingNow: snowfallDuring >= 0.5,
      maxTemp48h,
      snowTemp,
      rainedRecently: rained,
    }),
  };
}

/** Today's date and the next whole hour at a venue, from its UTC offset. */
export function venueNow(utcOffsetSeconds: number, now = new Date()): { date: string; hour: string } {
  const local = new Date(now.getTime() + utcOffsetSeconds * 1000 + 3600_000);
  return { date: local.toISOString().slice(0, 10), hour: local.toISOString().slice(11, 13) + ":00" };
}

export type Place = {
  name: string;
  detail: string; // "Vernon, British Columbia, Canada"
  kind: string | null; // "Nordic centre", "Ski resort", "Town", "Peak"…
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  source: "osm" | "geonames";
  /** Found by looking around this town, which the place's own name may not mention. Shown, not saved. */
  near?: string;
};

// Words a skier often types joined up ("Silverstar", "Sovereignlake"), split
// so the gazetteers recognise them ("Silver Star", "Sovereign Lake").
const JOINED = /(star|lakes?|creek|mountain|ridge|valley|park|hill|nordic|peak|pass|meadows?|basin|bowl)$/i;

/** The search text plus, if it looks glued together, a spaced-out version. */
export function searchVariants(text: string): string[] {
  const t = text.trim().replace(/\s+/g, " ");
  const out = [t];
  const words = t.split(" ");
  const spaced = words
    .map((w) => {
      const m = w.length > 6 ? JOINED.exec(w) : null;
      if (!m || m.index <= 2) return w;
      const tail = w.slice(m.index);
      // Keep the writer's style: "Silverstar" → "Silver Star", "silverstar" → "silver star".
      return `${w.slice(0, m.index)} ${w[0] === w[0].toUpperCase() ? tail[0].toUpperCase() + tail.slice(1) : tail}`;
    })
    .join(" ");
  if (spaced.toLowerCase() !== t.toLowerCase()) out.push(spaced);
  return out;
}

const KIND_WORDS: Record<string, string> = {
  winter_sports: "Ski area",
  ski: "Ski area",
  ski_resort: "Ski resort",
  sports_centre: "Sports centre",
  park: "Park",
  nature_reserve: "Nature reserve",
  peak: "Peak",
  lake: "Lake",
  water: "Lake",
  village: "Village",
  town: "Town",
  city: "City",
  hamlet: "Hamlet",
  locality: "Locality",
  trailhead: "Trailhead",
  alpine_hut: "Hut",
  wilderness_hut: "Hut",
  pitch: "Sports field",
  track: "Track",
};

const WATER_SKI = /\bwater[- ]?ski/i;

function kindOf(type: string, name: string): string | null {
  if (WATER_SKI.test(name)) return KIND_WORDS[type] ?? null;
  if (/nordic|cross[- ]country|ski club|xc /i.test(name)) return "Nordic centre";
  return KIND_WORDS[type] ?? null;
}

const kmBetween = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const dLat = (a.latitude - b.latitude) * 111;
  const dLon = (a.longitude - b.longitude) * 111 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
};

/** OpenStreetMap's gazetteer: knows ski areas, Nordic centres, trailheads and huts. */
/** Narrowing a place search: an ISO country code, and a province or state name. */
export type SearchArea = { country?: string | null; province?: string | null };

// Nominatim's usage policy allows one request a second. Sent five at once
// from a shared server, the extra ones were turned away, and a refused search
// reads as "nothing found": "Rossland" found the town but not the ski club
// beside it. So requests from this server wait their turn, one a second.
let osmTurn = Promise.resolve();
function osmSlot(): Promise<void> {
  const mine = osmTurn;
  osmTurn = mine.then(() => new Promise((r) => setTimeout(r, 1100)));
  return mine;
}

/** A square of about 40 km each way around a point, as Nominatim's viewbox (west,north,east,south). */
// 40, because a town's Nordic centre is often up the hill: Sovereign Lake is
// about 35 km from Vernon.
export function viewboxAround(p: { latitude: number; longitude: number }, km = 40): string {
  const dLat = km / 111;
  const dLon = km / (111 * Math.max(0.2, Math.cos((p.latitude * Math.PI) / 180)));
  const r = (n: number) => Math.round(n * 1e4) / 1e4;
  return [r(p.longitude - dLon), r(p.latitude + dLat), r(p.longitude + dLon), r(p.latitude - dLat)].join(",");
}

// What a search with "ski" in it also finds and nobody waxes at: the ski
// shop, the lodge, the car park. A shop at a town's centre was also merged
// with the town (within 200 m) and took its place in the list.
const NOT_VENUES = new Set(["shop", "highway", "emergency", "building", "office", "craft"]);
const NOT_VENUE_TYPES = new Set(["parking", "parking_space", "shelter", "first_aid_kit", "hotel", "motel", "guest_house", "hostel", "apartment"]);

async function searchOsm(text: string, area: SearchArea = {}, near?: { latitude: number; longitude: number }): Promise<Place[]> {
  await osmSlot();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", text);
  url.searchParams.set("format", "jsonv2");
  // A province is checked afterwards, so ask for more to keep enough after it.
  // Around a town, the most Nominatim gives: "ski" there is mostly shops, and
  // they would fill a short list before the ski club.
  url.searchParams.set("limit", near ? "40" : area.province ? "20" : "8");
  if (area.country) url.searchParams.set("countrycodes", area.country);
  if (near) {
    url.searchParams.set("viewbox", viewboxAround(near));
    url.searchParams.set("bounded", "1");
  }
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "en");
  // Nominatim's usage policy asks every app to identify itself.
  const res = await fetch(url, {
    headers: { "User-Agent": "MyWaxPlanner/1.0 (https://www.mywaxplanner.com)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    name?: string;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    category?: string;
    address?: Record<string, string>;
  }[];
  const kept = data.filter((r) => !NOT_VENUES.has(r.category ?? "") && !NOT_VENUE_TYPES.has(r.type));
  return kept.map((r) => {
    const a = r.address ?? {};
    const name = r.name || r.display_name.split(",")[0];
    return {
      name,
      detail: [a.city ?? a.town ?? a.village ?? a.county, a.state ?? a.province, a.country].filter(Boolean).join(", "),
      kind: kindOf(r.type, name),
      latitude: Math.round(Number(r.lat) * 1e5) / 1e5,
      longitude: Math.round(Number(r.lon) * 1e5) / 1e5,
      elevation_m: null,
      source: "osm" as const,
    };
  });
}

/** Open-Meteo's gazetteer (GeoNames): towns, peaks and lakes, with elevations. */
async function searchGeonames(text: string, area: SearchArea = {}): Promise<Place[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", text);
  url.searchParams.set("count", area.province ? "30" : "8");
  if (area.country) url.searchParams.set("countryCode", area.country.toUpperCase());
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: { name: string; latitude: number; longitude: number; elevation?: number; admin1?: string; country?: string; feature_code?: string }[];
  };
  const codes: Record<string, string> = { PPL: "Town", PPLA: "Town", PPLX: "Village", MT: "Peak", PK: "Peak", LK: "Lake", PRK: "Park", RSRT: "Resort" };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(", "),
    kind: kindOf("", r.name) ?? codes[r.feature_code ?? ""] ?? null,
    latitude: Math.round(r.latitude * 1e5) / 1e5,
    longitude: Math.round(r.longitude * 1e5) / 1e5,
    elevation_m: typeof r.elevation === "number" ? Math.round(r.elevation) : null,
    source: "geonames" as const,
  }));
}

/** Ground elevation for places that came without one, in one request. */
async function fillElevations(places: Place[]): Promise<void> {
  const missing = places.filter((p) => p.elevation_m === null);
  if (!missing.length) return;
  const url = new URL("https://api.open-meteo.com/v1/elevation");
  url.searchParams.set("latitude", missing.map((p) => p.latitude).join(","));
  url.searchParams.set("longitude", missing.map((p) => p.longitude).join(","));
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const data = (await res.json()) as { elevation?: number[] };
    data.elevation?.forEach((e, i) => {
      if (Number.isFinite(e)) missing[i].elevation_m = Math.round(e);
    });
  } catch {
    // An elevation is a nicety here; the forecast uses its own map height if it is missing.
  }
}

/** Places merged from both gazetteers; the same spot found twice (within 1 km) is listed once. */
export function mergePlaces(lists: Place[][]): Place[] {
  const out: Place[] = [];
  for (const p of lists.flat()) {
    const dupe = out.find((q) => kmBetween(p, q) < 1 && (q.name.toLowerCase() === p.name.toLowerCase() || kmBetween(p, q) < 0.2));
    if (dupe) {
      if (dupe.elevation_m === null) dupe.elevation_m = p.elevation_m;
      if (!dupe.kind) dupe.kind = p.kind;
      continue;
    }
    out.push({ ...p });
  }
  // Ski places first: they are what a skier is usually looking for.
  const ski = (p: Place) => (p.kind === "Nordic centre" ? 0 : p.kind === "Ski area" || p.kind === "Ski resort" ? 1 : 2);
  return out.sort((a, b) => ski(a) - ski(b)).slice(0, 12);
}

/** Places matching a name, for adding a venue: OpenStreetMap and GeoNames together. */
// Words a skier leaves out. "Hinton" finds the town, not "Hinton Nordic
// Centre", because OpenStreetMap matches every word of the name; so each
// search also asks with these added. Kept to three: Nominatim asks apps to
// send few requests, and every word is another one.
// "Resort" finds the downhill resort a hill is known by ("Red Mountain" →
// "Red Mountain Resort"), which the nearby search then looks around.
const ASSUMED_WORDS = ["Nordic", "Ski", "Resort"];

/** The search text with each assumed word the skier did not already type, e.g. "Hinton Nordic". */
export function assumedVariants(text: string): string[] {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return [];
  const has = new Set(t.toLowerCase().split(" "));
  // "Ski" is also covered by "skiing", "resort" by "resorts".
  const covered = (w: string) => has.has(w.toLowerCase()) || [...has].some((h) => h.startsWith(w.toLowerCase().replace(/s$/, "")));
  return ASSUMED_WORDS.filter((w) => !covered(w)).map((w) => `${t} ${w}`);
}

/** A place the assumed words may add: one that is about skiing, not a "Hinton Park" picked up by "Trails". */
export function isSkiPlace(p: Pick<Place, "name" | "kind">): boolean {
  if (WATER_SKI.test(p.name)) return false;
  return (
    p.kind === "Nordic centre" ||
    p.kind === "Ski area" ||
    p.kind === "Ski resort" ||
    /\b(nordic|ski|skiing|cross[- ]country|trails?|langlauf)\b/i.test(p.name)
  );
}

const TOWN_KINDS = new Set(["Town", "City", "Village", "Hamlet", "Locality"]);

/**
 * The place to look around when the search named a town or a hill rather than
 * a trail network: the first town found, else the first place that is not
 * itself a ski place. Null when the search found a ski place, or nothing.
 */
export function anchorOf(places: Place[]): Place | null {
  // A downhill resort first: "Red Mountain" is eight peaks in BC alone, but
  // only one Red Mountain Resort, and Nordic trails are often beside one.
  // Then a town, in the order found: OpenStreetMap's answer comes first and
  // is its best match ("Rossland" in BC, not a hamlet in Norway), and it
  // leaves a town's kind empty (an administrative boundary). Then a Nordic
  // centre, whose neighbours are worth listing too; then whatever was found.
  return (
    places.find((p) => p.kind === "Ski area" || p.kind === "Ski resort") ??
    places.find((p) => p.kind === null || TOWN_KINDS.has(p.kind)) ??
    places.find((p) => p.kind === "Nordic centre") ??
    places[0] ??
    null
  );
}

// What a skier's place is called, asked for around a town: "ski" finds a
// ski club or resort, "nordic" a Nordic centre (Sovereign Lake, near
// Vernon), "cross country" a recreation site (Paulson, near Rossland). Each
// word is another request a second apart, so the list is short. They are
// English words: OpenStreetMap matches names, so a "Loipe" is not found.
const NEARBY_WORDS = ["ski", "nordic", "cross country"];
const SKI_KINDS = new Set(["Nordic centre", "Ski area", "Ski resort"]);

export async function searchPlaces(text: string, area: SearchArea = {}): Promise<Place[]> {
  const variants = searchVariants(text);
  // OpenStreetMap also gets the province in the words, which finds a small
  // place a bare name would rank below the twenty it returns.
  const osmTexts = area.province ? [...variants, `${variants[0]}, ${area.province}`] : variants;
  const province = area.province;
  const keep = (settled: PromiseSettledResult<Place[]>[]) =>
    settled
      .filter((r): r is PromiseFulfilledResult<Place[]> => r.status === "fulfilled")
      .map((r) => (province ? r.value.filter((p) => inProvince(p.detail, province)) : r.value));

  // By name, and by name with the words a skier leaves out ("Hinton" →
  // "Hinton Nordic"); a name like "Black Jack" is also a town in Missouri.
  const assumed = assumedVariants(variants[variants.length - 1]);
  const settled = await Promise.allSettled([
    ...osmTexts.map((v) => searchOsm(v, area)),
    ...variants.map((v) => searchGeonames(v, area)),
    ...assumed.map((v) => searchOsm(v, area).then((ps) => ps.filter(isSkiPlace))),
  ]);
  const lists = keep(settled);

  // Then around what was found: a resort, a town or a hill rather than a
  // trail network's own name. This finds a club whose name does not mention
  // the town ("Rossland" → Black Jack Cross Country Ski Club), anywhere in
  // the world OpenStreetMap has mapped it. Only a place that is a ski place
  // by its kind: "ski" also finds the lodge, the ski patrol's lift and the shop.
  const anchor = anchorOf(lists.flat());
  const extra = await Promise.allSettled(
    anchor
      ? NEARBY_WORDS.map((w) =>
          searchOsm(w, area, anchor).then((ps) =>
            ps.filter((p) => p.kind && SKI_KINDS.has(p.kind) && p.name !== anchor.name).map((p) => ({ ...p, near: anchor.name })),
          ),
        )
      : [],
  );
  lists.push(...keep(extra));
  if ([...settled, ...extra].every((r) => r.status === "rejected")) {
    throw new ForecastError("The place search did not answer. Try again in a minute.");
  }
  const places = mergePlaces(lists);
  await fillElevations(places);
  return places;
}
