import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { layersFor, recommend, temperatureFit, toolKey, type Candidate, type Request, type Rule } from "./engine";

// The rules exactly as the migration seeds them, so the tests check the real defaults.
function seededRules(): Rule[] {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261119000000_default_rules.sql"), "utf8");
  const rows = [...sql.matchAll(/^\s*\((.+)\),?;?$/gm)].map((m) => m[1]);
  const val = (s: string) => {
    s = s.trim();
    if (s === "null") return null;
    if (s.startsWith("'{")) return s.slice(2, -2) ? s.slice(2, -2).split(",") : [];
    if (s.startsWith("'")) return s.slice(1, -1);
    return Number(s);
  };
  return rows
    .filter((r) => !r.startsWith("technique"))
    .map((r) => {
      const parts = [...r.matchAll(/\s*('\{[^}]*\}'|'[^']*'|[^,]+)\s*(?:,|$)/g)].map((m) => val(m[1]));
      return {
        technique: parts[0],
        mode: parts[1],
        layer_role: parts[2],
        snow_temp_min_c: parts[3],
        snow_temp_max_c: parts[4],
        snow_types: parts[5],
        snow_humidity_bands: parts[6],
        product_category: parts[7],
        weight: parts[8],
        notes: parts[9],
      } as Rule;
    });
}

let id = 0;
const wax = (name: string, category: string, min: number | null, max: number | null, more: Partial<Candidate> = {}): Candidate => ({
  id: `p${++id}`,
  created_by: null,
  name,
  category: category as Candidate["category"],
  category_group: ["hardwax", "klister", "binder", "skin_care", "grip_spray"].includes(category) ? "grip" : "glide",
  form: "block",
  published_temp_min_c: min,
  published_temp_max_c: max,
  temp_min_c: min,
  temp_max_c: max,
  snow_types: [],
  humidity_bands: [],
  layer_roles: [],
  fluoro_status: "fluoro_free",
  iron_temp_c: 130,
  brand: { name: "Brand", temperature_basis: "snow" },
  user_product_id: "u" + id,
  amount_left: "full",
  price: null,
  currency: null,
  buy_url: null,
  ...more,
});

const req = (over: Partial<Request> & { snow?: number; type?: Request["conditions"]["snow_type"] }): Request => ({
  technique: over.technique ?? "skate",
  gripType: over.gripType ?? null,
  mode: over.mode ?? "recreational",
  family: over.family ?? "any",
  ski: over.ski ?? null,
  conditions: {
    snow_temp_c: over.snow ?? -6,
    air_temp_c: null,
    snow_type: over.type ?? "fine_grained",
    snow_humidity_band: "dry",
    air_humidity_band: "mid",
    new_snow_cm: 0,
  },
});

const rules = seededRules();
const allTools = new Set(["iron:", "scraper:plexi", "groove_scraper:", "brush:brass", "brush:nylon", "brush:horsehair", "cork:natural"].map((k) => k));

test("the seeded rules parse", () => {
  assert.ok(rules.length >= 20);
  assert.ok(rules.every((r) => typeof r.weight === "number"));
});

test("temperature fit is best inside the range and fades outside it", () => {
  assert.ok(temperatureFit({ temp_min_c: -10, temp_max_c: -2 }, -6)! >= 0.99);
  assert.ok(temperatureFit({ temp_min_c: -10, temp_max_c: -2 }, -2)! >= 0.8);
  assert.equal(temperatureFit({ temp_min_c: -10, temp_max_c: -2 }, 2), 0);
  assert.equal(temperatureFit({ temp_min_c: null, temp_max_c: null }, -6), null);
});

test("a recreational skate plan is a single temperature wax", () => {
  const roles = layersFor(rules, req({})).map((l) => l.role);
  assert.deepEqual(roles, ["temperature"]);
});

test("a race plan adds cleaning, and a top coat; abrasive snow adds a base", () => {
  assert.deepEqual(layersFor(rules, req({ mode: "race" })).map((l) => l.role), ["cleaning", "temperature", "top_coat"]);
  assert.deepEqual(layersFor(rules, req({ mode: "race", type: "transformed" })).map((l) => l.role), ["cleaning", "base", "temperature", "top_coat"]);
});

test("classic waxable: hardwax on cold new snow, klister with binder on icy snow", () => {
  const cold = layersFor(rules, req({ technique: "classic", gripType: "waxable", snow: -8, type: "fresh_set" }));
  const kick = cold.find((l) => l.role === "kick")!;
  assert.equal([...kick.weights.entries()].sort((a, b) => b[1] - a[1])[0][0], "hardwax");
  assert.ok(!cold.some((l) => l.role === "binder"));

  const icy = layersFor(rules, req({ technique: "classic", gripType: "waxable", snow: -5, type: "icy" }));
  assert.equal([...icy.find((l) => l.role === "kick")!.weights.entries()].sort((a, b) => b[1] - a[1])[0][0], "klister");
  assert.ok(icy.some((l) => l.role === "binder"));
});

test("skin and zero skis get no kick wax; skins get skin care", () => {
  assert.ok(!layersFor(rules, req({ technique: "classic", gripType: "zero" })).some((l) => l.role === "kick"));
  assert.ok(layersFor(rules, req({ technique: "classic", gripType: "skin" })).some((l) => l.role === "skin_care"));
});

test("the best wax in the box wins, and the catalogue only offers better ones", () => {
  const cold = wax("Green", "hydrocarbon", -20, -10);
  const blue = wax("Blue", "hydrocarbon", -10, -3);
  const red = wax("Red", "hydrocarbon", -4, 0);
  const shopBest = wax("Shop blue", "hydrocarbon", -9, -3, { user_product_id: null, amount_left: null, snow_types: ["fine_grained"], humidity_bands: ["dry"] });
  const shopWorse = wax("Shop red", "hydrocarbon", -2, 2, { user_product_id: null, amount_left: null });
  const r = recommend(req({}), rules, [cold, blue, red], [shopBest, shopWorse], [], allTools);
  const temp = r.layers.find((l) => l.role === "temperature")!;
  assert.equal(temp.pick?.product.name, "Blue");
  assert.deepEqual(temp.market.map((m) => m.product.name), ["Shop blue"]);
  assert.equal(r.gaps.length, 0);
});

test("race plans never use fluoro wax, and empty waxes are skipped", () => {
  const fluoro = wax("HF Blue", "synthetic", -10, -3, { fluoro_status: "high" });
  const empty = wax("Empty blue", "synthetic", -10, -3, { amount_left: "empty" });
  const ok = wax("FF Blue", "synthetic", -12, -2);
  const r = recommend(req({ mode: "race" }), rules, [fluoro, empty, ok], [], [], allTools);
  assert.equal(r.layers.find((l) => l.role === "temperature")!.pick?.product.name, "FF Blue");
});

test("past ratings in similar snow move a wax up", () => {
  const a = wax("A", "hydrocarbon", -10, -2);
  const b = wax("B", "hydrocarbon", -10, -2);
  const history = [{ snow_temp_c: -5, product_ids: [b.id], glide_rating: 5, grip_rating: null }];
  const r = recommend(req({}), rules, [a, b], [], history, allTools);
  const pick = r.layers[0].pick!;
  assert.equal(pick.product.name, "B");
  assert.ok(pick.reasons.some((x) => x.includes("you rated it")));
});

test("an empty box gives gaps, and a missing tool is named", () => {
  const r = recommend(req({}), rules, [], [], [], new Set([toolKey("brush", "nylon")]));
  assert.ok(r.gaps.some((g) => g.kind === "wax"));
  assert.ok(r.gaps.some((g) => g.kind === "tool" && g.text.startsWith("Wax iron")));
  assert.ok(r.procedure[0].steps.some((s) => s.text.includes("Rub")), "without an iron the wax is rubbed on");
});

test("a kick plan suggests warmer and colder waxes to carry", () => {
  const blue = wax("Blue hardwax", "hardwax", -10, -3);
  const violet = wax("Violet hardwax", "hardwax", -3, 0);
  const green = wax("Green hardwax", "hardwax", -20, -10);
  const r = recommend(req({ technique: "classic", gripType: "waxable", snow: -6, type: "fresh_set" }), rules, [blue, violet, green], [], [], allTools);
  assert.equal(r.layers.find((l) => l.role === "kick")!.pick?.product.name, "Blue hardwax");
  assert.deepEqual(r.carry.map((c) => c.product.name), ["Violet hardwax", "Green hardwax"]);
});
