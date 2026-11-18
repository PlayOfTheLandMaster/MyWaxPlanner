// A ski brand's logo, for the Skis list and a pair's page (a nice-to-have the
// owner asked for). The brand is free text, so it is matched to a known
// maker's website; the logo is that site's icon, fetched by the reader's
// browser from Google's public favicon service. Only the maker's website is
// sent, never anything about the skier. An unknown or misspelled brand has
// no logo, and the row simply shows none. Pure, so it can be tested.

/** Cross-country ski makers, by the words people type, and their websites. */
const MAKERS: [RegExp, string][] = [
  [/^fischer\b/, "fischersports.com"],
  [/^atomic\b/, "atomic.com"],
  [/^rossignol\b|^rossi\b/, "rossignol.com"],
  [/^salomon\b/, "salomon.com"],
  [/^madshus\b/, "madshus.com"],
  [/^peltonen\b/, "peltonen.fi"],
  [/^alpina\b/, "alpina-sports.com"],
  [/^(åsnes|asnes)\b/, "asnes.com"],
  [/^elan\b/, "elanskis.com"],
  [/^head\b/, "head.com"],
  [/^kneissl\b/, "kneissl.com"],
  [/^(skitrab|trab)\b/, "trab.it"],
  [/^sporten\b/, "sporten.cz"],
  [/^karhu\b/, "karhu.com"],
  [/^yoko\b/, "yoko.fi"],
];

/** The maker's website for a typed brand, or null when it is not one we know. */
export function makerSite(brand: string | null | undefined): string | null {
  const b = (brand ?? "").trim().toLowerCase();
  if (!b) return null;
  return MAKERS.find(([re]) => re.test(b))?.[1] ?? null;
}

/** The logo image for a typed brand, or null. */
export function brandLogoUrl(brand: string | null | undefined): string | null {
  const site = makerSite(brand);
  return site ? `https://www.google.com/s2/favicons?domain=${site}&sz=128` : null;
}
