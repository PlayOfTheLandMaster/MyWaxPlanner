import { formatRange } from "@/lib/catalogue/labels";
import type { TemperatureBasis } from "@/lib/catalogue/vocab";

type Ranged = {
  published_temp_min_c: number | null;
  published_temp_max_c: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  old_published_temp_min_c?: number | null;
  old_published_temp_max_c?: number | null;
  old_temp_min_c?: number | null;
  old_temp_max_c?: number | null;
  brand: { temperature_basis: TemperatureBasis };
  snow_range_is_yours?: boolean;
};

/**
 * The temperature line for a wax: its snow range, which is what recommendations
 * compare. An air-rated wax without a snow range says so, rather than showing
 * its air range as if it could be compared with the others.
 */
export function rangeText(p: Ranged): string | null {
  const first = firstRangeText(p);
  const old = oldRangeText(p);
  if (!old) return first;
  // Two ranges: say which snow each is for.
  return `${first ? `New snow ${first}` : "New snow: no range"} · Old snow ${old}`;
}

/** The old-snow range's text, or null when the wax has none. */
export function oldRangeText(p: Ranged): string | null {
  const snow = formatRange(p.old_temp_min_c ?? null, p.old_temp_max_c ?? null);
  if (snow) return `${snow} snow`;
  const printed = formatRange(p.old_published_temp_min_c ?? null, p.old_published_temp_max_c ?? null);
  if (printed && p.brand.temperature_basis === "air") return `${printed} air · no snow range yet`;
  return printed ? `${printed} snow` : null;
}

function firstRangeText(p: Ranged): string | null {
  const snow = formatRange(p.temp_min_c, p.temp_max_c);
  if (snow) return p.snow_range_is_yours ? `${snow} snow (your range)` : `${snow} snow`;
  const printed = formatRange(p.published_temp_min_c, p.published_temp_max_c);
  if (printed && p.brand.temperature_basis === "air") return `${printed} air · no snow range yet`;
  return null;
}
