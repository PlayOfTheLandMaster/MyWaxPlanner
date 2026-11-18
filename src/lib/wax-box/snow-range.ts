// A skier's own snow range for a wax (table user_snow_ranges). Pure, so the
// form's rules and the way plans apply the range can be tested.

import { readNumber } from "@/lib/catalogue/csv";

export type SnowRange = {
  temp_min_c: number | null;
  temp_max_c: number | null;
  /** The skier's own range for old or transformed snow; optional. */
  old_temp_min_c?: number | null;
  old_temp_max_c?: number | null;
  /** The skier's own iron temperature, used only where the maker gives none. */
  iron_temp_c?: number | null;
};

export type SnowRangeInput = { range: SnowRange; error?: undefined } | { range?: undefined; error: string };

/** Reads the From / To fields. Accepts "−8", "–8" and "-8", like the rest of the app. */
export function readSnowRange(form: FormData): SnowRangeInput {
  const read = (name: string, label: string): number | null | string => {
    const v = readNumber(String(form.get(name) ?? ""));
    if (v === "invalid") return `${label} should be a temperature in °C, such as −8.`;
    if (v !== null && (v < -50 || v > 20)) return `${label} should be between −50 and +20 °C.`;
    return v;
  };
  const min = read("snow_temp_min_c", "From");
  if (typeof min === "string") return { error: min };
  const max = read("snow_temp_max_c", "To");
  if (typeof max === "string") return { error: max };
  if (min === null && max === null) return { error: "Enter at least one end of the snow range." };
  if (min !== null && max !== null && min > max) {
    return { error: "The range runs backwards: From should be the colder end." };
  }
  const oldMin = read("old_snow_temp_min_c", "Old snow From");
  if (typeof oldMin === "string") return { error: oldMin };
  const oldMax = read("old_snow_temp_max_c", "Old snow To");
  if (typeof oldMax === "string") return { error: oldMax };
  if (oldMin !== null && oldMax !== null && oldMin > oldMax) {
    return { error: "The old-snow range runs backwards: From should be the colder end." };
  }
  return { range: { temp_min_c: min, temp_max_c: max, old_temp_min_c: oldMin, old_temp_max_c: oldMax } };
}

type Ranged = {
  id: string;
  temp_min_c: number | null;
  temp_max_c: number | null;
  old_temp_min_c?: number | null;
  old_temp_max_c?: number | null;
  iron_temp_c?: number | null;
};

/**
 * Gives each wax the skier's own snow range where they have one, and marks
 * it, so the screen can say whose range it is. A wax without one is returned
 * unchanged. The skier's range wins over the wax's own: it is the more
 * specific knowledge, and for shared waxes the wax's own is empty anyway.
 */
export function applySnowRanges<T extends Ranged>(
  waxes: T[],
  ranges: Map<string, SnowRange>,
): (T & { snow_range_is_yours: boolean; iron_is_yours: boolean })[] {
  return waxes.map((w) => {
    const r = ranges.get(w.id);
    // The maker's iron temperature comes first; the skier's fills a gap.
    const yourIron = r?.iron_temp_c != null && w.iron_temp_c == null;
    const iron = yourIron ? { iron_temp_c: r!.iron_temp_c } : {};
    // A row may hold only an iron temperature: then the wax keeps its own range.
    if (!r || (r.temp_min_c == null && r.temp_max_c == null)) return { ...w, ...iron, snow_range_is_yours: false, iron_is_yours: yourIron };
    // The skier's old-snow range, when they gave one, replaces the wax's own too.
    const old = r.old_temp_min_c != null || r.old_temp_max_c != null ? { old_temp_min_c: r.old_temp_min_c ?? null, old_temp_max_c: r.old_temp_max_c ?? null } : {};
    return { ...w, temp_min_c: r.temp_min_c, temp_max_c: r.temp_max_c, ...old, ...iron, snow_range_is_yours: true, iron_is_yours: yourIron };
  });
}

/** Reads Your iron temperature: blank clears it, otherwise 80–180 °C. */
export function readIronTemp(form: FormData): { iron: number | null; error?: undefined } | { iron?: undefined; error: string } {
  const v = readNumber(String(form.get("iron_temp_c") ?? ""));
  if (v === "invalid") return { error: "The iron temperature should be a number in °C, such as 130." };
  if (v !== null && (v < 80 || v > 180)) return { error: "The iron temperature should be between 80 and 180 °C." };
  return { iron: v === null ? null : Math.round(v) };
}
