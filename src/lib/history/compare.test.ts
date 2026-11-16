import { test } from "node:test";
import assert from "node:assert/strict";
import { compareSections, parseCompareIds } from "./compare";
import type { Session } from "./load";

const id = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;

function session(over: Partial<Session>): Session {
  return {
    id: id(1),
    occurred_at: "2026-11-15T18:00:00Z",
    status: "completed",
    technique: "classic",
    mode: "recreational",
    ski_id: null,
    venue_id: null,
    event_name: null,
    event_distance_km: null,
    event_result: null,
    finish_notes: null,
    finish_tags: [],
    glide_rating: 4,
    grip_rating: 3,
    durability_rating: null,
    durability_km: null,
    durability_hours: null,
    kick_feel: null,
    notes: null,
    ski: { name: "Fischer" },
    skier: null,
    venue: { name: "Canmore" },
    actual: {
      air_temp_c: -3, snow_temp_c: -5, snow_temp_estimated: false, air_rh_pct: null, air_humidity_band: "dry",
      snow_humidity_band: "dry", snow_type: "fine_grained", new_snow_cm: null, sky: null, wind_kmh: null, track: null,
    },
    forecast: null,
    layers: [],
    photos: [],
    plan: null,
    wax_steps_done: [],
    waxed_at: null,
    ...over,
  } as Session;
}

const layer = (zone: "glide" | "grip", position: number, layer_role: string, name: string) => ({
  id: `${zone}${position}`, zone, position, layer_role, product_id: null, user_product_id: null, custom_product: null,
  method: null, iron_temp_c: null, passes: null, scrape_brush_steps: null, notes: null,
  product: { name, fluoro_status: "fluoro_free", brand: { name: "Swix" } },
});

const sections = (list: Session[]) => compareSections(list, (iso) => iso.slice(0, 10));
const find = (list: Session[], label: string) => sections(list).flatMap((s) => s.rows).find((r) => r.label === label);

test("ids: uuids only, no repeats, at most four", () => {
  assert.deepEqual(parseCompareIds([id(1), id(1), "nope", `${id(2)},${id(3)}`]), { ids: [id(1), id(2), id(3)], tooMany: false });
  const five = parseCompareIds([1, 2, 3, 4, 5].map(id));
  assert.equal(five.ids.length, 4);
  assert.equal(five.tooMany, true);
  assert.deepEqual(parseCompareIds(undefined), { ids: [], tooMany: false });
});

test("rows that differ are marked; rows that agree are not", () => {
  const a = session({ glide_rating: 4 });
  const b = session({ id: id(2), glide_rating: 2, actual: { ...a.actual!, snow_temp_c: -12 } });
  assert.equal(find([a, b], "Venue")?.differs, false);
  assert.equal(find([a, b], "Glide")?.differs, true);
  assert.deepEqual(find([a, b], "Snow")?.values, ["−5 °C", "−12 °C"]);
});

test("layers line up by role, in prep order", () => {
  const a = session({ layers: [layer("glide", 2, "top_coat", "Top"), layer("glide", 1, "base", "V20 Green")] });
  const b = session({ id: id(2), layers: [layer("glide", 1, "base", "V30 Blue")] });
  const glide = sections([a, b]).find((s) => s.title === "Glide wax")!;
  assert.deepEqual(glide.rows.map((r) => r.label), ["Base layer", "Top coat"]);
  assert.deepEqual(glide.rows[0].values, ["Swix V20 Green", "Swix V30 Blue"]);
  assert.deepEqual(glide.rows[1].values, ["Swix Top", null]);
  assert.equal(glide.rows[1].differs, true);
});

test("empty rows and sections are dropped; skate-only hides grip", () => {
  const a = session({ technique: "skate", grip_rating: null });
  const b = session({ id: id(2), technique: "skate", grip_rating: null });
  const titles = sections([a, b]).map((s) => s.title);
  assert.ok(!titles.includes("Grip wax"));
  assert.ok(!titles.includes("Glide wax")); // no layers at all
  assert.equal(find([a, b], "Grip"), undefined);
  assert.equal(find([a, b], "Event"), undefined);
});

test("forecast-only conditions say so; notes are never marked", () => {
  const a = session({ actual: null, forecast: session({}).actual, notes: "fast" });
  const b = session({ id: id(2), notes: "slow" });
  assert.equal(find([a, b], "Snow")?.values[0], "−5 °C (forecast)");
  assert.equal(find([a, b], "Notes")?.differs, false);
});
