// Two temperature ranges for one wax: Swix prints one for falling snow and
// another for old or transformed snow on its grip waxes, and some custom glide
// waxes do the same. The first range covers new snow and any wax with only
// one; the second, when a wax has it, covers old snow. Pure, so the engine and
// the wax box agree and it can be tested.

import { SNOW_TYPES, type SnowType } from "@/lib/catalogue/vocab";

/** New snow: falling, or fresh and settled. Everything else counts as old or transformed (the owner's call). */
export const NEW_SNOW: readonly SnowType[] = ["falling", "fresh_set"];
export const OLD_SNOW: readonly SnowType[] = SNOW_TYPES.filter((t) => !NEW_SNOW.includes(t));

export type TwoRanges = {
  temp_min_c: number | null;
  temp_max_c: number | null;
  old_temp_min_c?: number | null;
  old_temp_max_c?: number | null;
};

export const hasOldRange = (p: TwoRanges) => p.old_temp_min_c != null || p.old_temp_max_c != null;

/** The snow range to compare for this snow type, and whether it is the old-snow one. */
export function rangeFor(p: TwoRanges, snowType: string | null | undefined): { temp_min_c: number | null; temp_max_c: number | null; old: boolean } {
  if (snowType && (OLD_SNOW as readonly string[]).includes(snowType) && hasOldRange(p)) {
    return { temp_min_c: p.old_temp_min_c ?? null, temp_max_c: p.old_temp_max_c ?? null, old: true };
  }
  return { temp_min_c: p.temp_min_c, temp_max_c: p.temp_max_c, old: false };
}
