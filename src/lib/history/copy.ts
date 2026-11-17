// "Copy to other skis": one wax put on several pairs, typically a coach
// waxing a squad's skis the same way. Each copy is its own planned session
// (rated separately afterwards); only the waxing is shared. Pure, so it can
// be tested; the action reads and writes.

import type { SessionLayer } from "./load";

export type CopySki = { id: string; name: string; technique: string; skier_id: string | null };

export type CopyGroup = { owner: string | null; name: string; skis: CopySki[] };

/**
 * The pairs a session can be copied to: same technique (classic grip wax on
 * skate skis means nothing), not the pair it is already on, grouped by owner
 * with the account holder first, then skiers A–Z.
 */
export function copyTargets(
  skis: CopySki[],
  source: { technique: string; ski_id: string | null },
  skiers: { id: string; name: string }[],
  me: string,
): CopyGroup[] {
  const usable = skis.filter((k) => k.technique === source.technique && k.id !== source.ski_id);
  const owners = [{ id: null as string | null, name: me }, ...[...skiers].sort((a, b) => a.name.localeCompare(b.name))];
  return owners
    .map((o) => ({
      owner: o.id,
      name: o.name,
      skis: usable.filter((k) => k.skier_id === o.id).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.skis.length > 0);
}

/** The picked ids that are real targets, without repeats, at most 40 at a time. */
export function pickedSkis(raw: FormDataEntryValue[], targets: CopyGroup[]): string[] {
  const allowed = new Set(targets.flatMap((g) => g.skis.map((k) => k.id)));
  return [...new Set(raw.filter((v): v is string => typeof v === "string" && allowed.has(v)))].slice(0, 40);
}

export type CopySource = {
  occurred_at: string;
  status: string;
  technique: string;
  mode: string;
  venue_id: string | null;
  event_name: string | null;
  event_distance_km: number | null;
  finish_notes: string | null;
  finish_tags: string[];
  forecast_conditions_id: string | null;
  recommendation_id: string | null;
  layers: Pick<
    SessionLayer,
    | "zone"
    | "position"
    | "layer_role"
    | "user_product_id"
    | "product_id"
    | "custom_product"
    | "method"
    | "iron_temp_c"
    | "passes"
    | "scrape_brush_steps"
    | "notes"
  >[];
};

/**
 * One copy, as the save function takes it. A planned session keeps its time
 * (the squad skis the same race); a finished one is copied for now. Ratings,
 * results and what the snow was really like stay behind: they belong to the
 * pair that skied.
 */
export function copyPayload(src: CopySource, skiId: string, now: Date) {
  return {
    session: {
      occurred_at: src.status === "planned" ? src.occurred_at : now.toISOString(),
      status: "planned",
      technique: src.technique,
      ski_id: skiId,
      mode: src.mode,
      venue_id: src.venue_id,
      event_name: src.event_name,
      event_distance_km: src.event_distance_km,
      finish_notes: src.finish_notes,
      finish_tags: src.finish_tags,
      // The same forecast and plan rows: shared, not duplicated.
      forecast_conditions_id: src.forecast_conditions_id,
      recommendation_id: src.recommendation_id,
    },
    layers: [...src.layers]
      .sort((a, b) => (a.zone === b.zone ? a.position - b.position : a.zone === "glide" ? -1 : 1))
      .map((l) => ({
        zone: l.zone,
        layer_role: l.layer_role,
        user_product_id: l.user_product_id,
        // A wax since gone from the box is kept by name, as "Repeat this prep" does.
        custom_product: l.user_product_id ? null : l.custom_product,
        method: l.method,
        iron_temp_c: l.iron_temp_c,
        passes: l.passes,
        scrape_brush_steps: l.scrape_brush_steps,
        notes: l.notes,
      })),
  };
}
