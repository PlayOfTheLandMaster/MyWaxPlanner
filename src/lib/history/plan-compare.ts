// What was planned against what went on the skis. A session made from a plan
// keeps the recommendation (recommendations.layers), so the plan is never
// lost when the skier swaps or skips a layer: the two are compared here by
// zone and layer role. Pure, so it can be tested.

export type PlannedLayer = { zone: string; layer_role: string; product_id: string | null; name: string | null };
export type UsedLayer = { id: string; zone: string; layer_role: string | null; product_id: string | null };

export type LayerComparison = {
  /** For each used layer (by id): the planned wax's name when a different one was used. */
  swapped: Map<string, string>;
  /** Planned layers with no used layer for their zone and role. */
  skipped: PlannedLayer[];
};

export function comparePlan(planned: PlannedLayer[], used: UsedLayer[]): LayerComparison {
  const swapped = new Map<string, string>();
  const matched = new Set<number>();
  for (const u of used) {
    const i = planned.findIndex((p, j) => !matched.has(j) && p.zone === u.zone && p.layer_role === u.layer_role);
    if (i === -1) continue; // added by the skier: nothing to compare with
    matched.add(i);
    const p = planned[i];
    // A gap in the plan (no wax picked) that the skier filled is not a swap.
    if (p.product_id && p.product_id !== u.product_id) swapped.set(u.id, p.name ?? "another wax");
  }
  // Cleaning steps are part of the procedure, not layers on the session.
  const skipped = planned.filter((p, j) => !matched.has(j) && p.product_id && p.layer_role !== "cleaning");
  return { swapped, skipped };
}
