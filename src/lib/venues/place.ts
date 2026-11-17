// Country and province/state from a venue's free-text region. Regions come
// from the place search ("Kimberley, British Columbia, Canada") or were typed
// ("Canmore, AB"), so both full names and postal abbreviations are read.
// Pure, so it can be tested.

const CA: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

const US: Record<string, string> = {
  AK: "Alaska",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  ID: "Idaho",
  IL: "Illinois",
  IA: "Iowa",
  ME: "Maine",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MT: "Montana",
  NV: "Nevada",
  NH: "New Hampshire",
  NM: "New Mexico",
  NY: "New York",
  ND: "North Dakota",
  OR: "Oregon",
  PA: "Pennsylvania",
  SD: "South Dakota",
  UT: "Utah",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const COUNTRY_ALIASES: Record<string, string> = {
  canada: "Canada",
  usa: "United States",
  us: "United States",
  "united states": "United States",
  "united states of america": "United States",
};

const byName = (table: Record<string, string>) => new Map(Object.values(table).map((n) => [n.toLowerCase(), n]));
const CA_NAMES = byName(CA);
const US_NAMES = byName(US);

export type Place = { country: string; province: string | null };

/** Where a region is; anything unreadable goes under "Other places". */
export function placeOf(region: string | null): Place {
  const parts = (region ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let country: string | null = null;
  let province: string | null = null;
  for (const raw of [...parts].reverse()) {
    const p = raw.toLowerCase();
    if (!country && COUNTRY_ALIASES[p]) {
      country = COUNTRY_ALIASES[p];
      continue;
    }
    if (province) continue;
    const up = raw.toUpperCase();
    const ca = CA[up] ?? CA_NAMES.get(p);
    const us = US[up] ?? US_NAMES.get(p);
    // A two-letter code both countries use (none do today) goes to the country already named.
    if (ca && (country === "Canada" || !us)) {
      province = ca;
      country ??= "Canada";
    } else if (us) {
      province = us;
      country ??= "United States";
    }
  }
  if (!country && parts.length > 1) country = parts[parts.length - 1];
  return { country: country ?? "Other places", province };
}

export type PlaceGroup<T> = { country: string; provinces: { province: string | null; venues: T[] }[] };

/** Venues grouped by country, then province or state, each A–Z; "Other places" last. */
export function groupByPlace<T extends { name: string; region: string | null }>(venues: T[]): PlaceGroup<T>[] {
  const countries = new Map<string, Map<string | null, T[]>>();
  for (const v of venues) {
    const { country, province } = placeOf(v.region);
    const provinces = countries.get(country) ?? new Map<string | null, T[]>();
    provinces.set(province, [...(provinces.get(province) ?? []), v]);
    countries.set(country, provinces);
  }
  const az = (a: string, b: string) => a.localeCompare(b);
  return [...countries.entries()]
    .sort(([a], [b]) => (a === "Other places" ? 1 : b === "Other places" ? -1 : az(a, b)))
    .map(([country, provinces]) => ({
      country,
      provinces: [...provinces.entries()]
        .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : az(a, b)))
        .map(([province, list]) => ({ province, venues: [...list].sort((x, y) => az(x.name, y.name)) })),
    }));
}
