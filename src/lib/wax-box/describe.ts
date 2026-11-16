import { formatRange } from "@/lib/catalogue/labels";
import type { TemperatureBasis } from "@/lib/catalogue/vocab";

type Ranged = {
  published_temp_min_c: number | null;
  published_temp_max_c: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  brand: { temperature_basis: TemperatureBasis };
  snow_range_is_yours?: boolean;
};

/**
 * The temperature line for a wax: its snow range, which is what recommendations
 * compare. An air-rated wax without a snow range says so, rather than showing
 * its air range as if it could be compared with the others.
 */
export function rangeText(p: Ranged): string | null {
  const snow = formatRange(p.temp_min_c, p.temp_max_c);
  if (snow) return p.snow_range_is_yours ? `${snow} snow (your range)` : `${snow} snow`;
  const printed = formatRange(p.published_temp_min_c, p.published_temp_max_c);
  if (printed && p.brand.temperature_basis === "air") return `${printed} air · no snow range yet`;
  return null;
}
