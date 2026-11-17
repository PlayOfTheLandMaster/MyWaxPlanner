import { test } from "node:test";
import assert from "node:assert/strict";
import { copyPayload, copyTargets, pickedSkis, type CopySource } from "./copy";

const skis = [
  { id: "mine-c", name: "Zero", technique: "classic", skier_id: null },
  { id: "mine-s", name: "Skate", technique: "skate", skier_id: null },
  { id: "anna-c", name: "Anna classic", technique: "classic", skier_id: "anna" },
  { id: "bo-c", name: "Bo classic", technique: "classic", skier_id: "bo" },
  { id: "bo-c2", name: "Bo cold", technique: "classic", skier_id: "bo" },
];
const skiers = [
  { id: "bo", name: "Bo K." },
  { id: "anna", name: "Anna E." },
];

test("targets: same technique, not the source pair, me first then skiers A–Z", () => {
  const g = copyTargets(skis, { technique: "classic", ski_id: "mine-c" }, skiers, "Finn P.");
  assert.deepEqual(
    g.map((x) => [x.name, x.skis.map((k) => k.id)]),
    [
      ["Anna E.", ["anna-c"]],
      ["Bo K.", ["bo-c", "bo-c2"]],
    ],
  );
});

test("picked: only real targets, no repeats", () => {
  const g = copyTargets(skis, { technique: "classic", ski_id: null }, skiers, "Me");
  assert.deepEqual(pickedSkis(["anna-c", "anna-c", "mine-s", "nope", "bo-c"], g), ["anna-c", "bo-c"]);
});

const src: CopySource = {
  occurred_at: "2026-11-20T16:00:00.000Z",
  status: "planned",
  technique: "classic",
  mode: "race",
  venue_id: "v",
  event_name: "Loppet",
  event_distance_km: 30,
  finish_notes: "Brush",
  finish_tags: ["structure"],
  forecast_conditions_id: "f",
  recommendation_id: "r",
  layers: [
    {
      zone: "grip",
      position: 1,
      layer_role: "kick",
      user_product_id: "u2",
      product_id: "p2",
      custom_product: null,
      method: "cork",
      iron_temp_c: null,
      passes: 3,
      scrape_brush_steps: null,
      notes: null,
    },
    {
      zone: "glide",
      position: 1,
      layer_role: "temperature",
      user_product_id: null,
      product_id: "p1",
      custom_product: "Old wax",
      method: "iron",
      iron_temp_c: 120,
      passes: null,
      scrape_brush_steps: null,
      notes: null,
    },
  ],
};

test("a planned session's copies keep its time and its waxing, glide first", () => {
  const p = copyPayload(src, "anna-c", new Date("2026-11-17T00:00:00Z"));
  assert.equal(p.session.occurred_at, src.occurred_at);
  assert.equal(p.session.ski_id, "anna-c");
  assert.equal(p.session.status, "planned");
  assert.deepEqual(
    p.layers.map((l) => l.zone),
    ["glide", "grip"],
  );
  assert.equal(p.layers[0].custom_product, "Old wax");
  assert.equal(p.layers[1].custom_product, null);
});

test("a finished session is copied for now, still unrated", () => {
  const now = new Date("2026-11-17T05:00:00Z");
  const p = copyPayload({ ...src, status: "completed" }, "bo-c", now);
  assert.equal(p.session.occurred_at, now.toISOString());
  assert.equal(p.session.status, "planned");
  assert.ok(!("glide_rating" in p.session));
});
