// The Country and Province/state boxes on Add a venue's place search. The
// country narrows both gazetteers at the source (an ISO code each accepts);
// the province is checked against each result's own address, because neither
// gazetteer takes one as a filter. Pure, so it can be tested.

import { CA, US } from "./place";

/** Countries with cross-country skiing, by ISO 3166 code. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "ca", name: "Canada" },
  { code: "us", name: "United States" },
  { code: "at", name: "Austria" },
  { code: "cz", name: "Czechia" },
  { code: "ee", name: "Estonia" },
  { code: "fi", name: "Finland" },
  { code: "fr", name: "France" },
  { code: "de", name: "Germany" },
  { code: "it", name: "Italy" },
  { code: "jp", name: "Japan" },
  { code: "nz", name: "New Zealand" },
  { code: "no", name: "Norway" },
  { code: "pl", name: "Poland" },
  { code: "si", name: "Slovenia" },
  { code: "se", name: "Sweden" },
  { code: "ch", name: "Switzerland" },
];

/** A country code from the list, or null for "Any country". */
export function countryCode(v: string | undefined): string | null {
  const c = (v ?? "").toLowerCase();
  return COUNTRIES.some((x) => x.code === c) ? c : null;
}

/** The provinces or states to offer for a country; empty means type it. */
export function provincesOf(code: string | null): string[] {
  const table = code === "ca" ? CA : code === "us" ? US : null;
  return table ? Object.values(table).sort((a, b) => a.localeCompare(b)) : [];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** The province as written, with a Canadian or US abbreviation spelt out ("bc" → "British Columbia"). */
export function provinceName(v: string | undefined): string | null {
  const t = (v ?? "").trim().slice(0, 60);
  if (!t) return null;
  return CA[t.toUpperCase()] ?? US[t.toUpperCase()] ?? t;
}

/** Whether a result's address ("Vernon, British Columbia, Canada") is in the province, as whole words. */
export function inProvince(detail: string, province: string): boolean {
  const p = norm(province);
  return p.length > 0 && ` ${norm(detail)} `.includes(` ${p} `);
}
