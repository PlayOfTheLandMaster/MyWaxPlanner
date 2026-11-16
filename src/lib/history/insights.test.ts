import { test } from "node:test";
import assert from "node:assert/strict";
import { bandOf, bestByBand, rated, spreads, tempDomain, usage, type InsightSession } from "./insights";

const s = (id: string, temp: number | null, glide: number | null, glideWaxes: string[], extra: Partial<InsightSession> = {}): InsightSession => ({
  id,
  technique: "skate",
  snow_temp_c: temp,
  glide_rating: glide,
  grip_rating: null,
  waxes: glideWaxes.map((name) => ({ zone: "glide", name })),
  ...extra,
});

const history = [
  s("a", -5, 4, ["Swix V20 Green"]),
  s("b", -6, 5, ["Swix V20 Green", "Vauhti UP Polar"]),
  s("c", -2, 2, ["Swix V20 Green"]),
  s("d", -1, 4, ["Rex Blue"]),
  s("e", null, 5, ["Rex Blue"]), // no snow temperature: not charted
  s("f", -1, null, ["Rex Blue"]), // not rated: counts only for usage
];

test("only rated sessions with a snow temperature are charted", () => {
  assert.deepEqual(rated(history, "glide").map((x) => x.id), ["a", "b", "c", "d"]);
});

test("each wax's spread, most-rated first, points coldest first", () => {
  const w = spreads(history, "glide");
  assert.deepEqual(w.map((x) => x.name), ["Swix V20 Green", "Vauhti UP Polar", "Rex Blue"]); // one rating each: the better one first
  assert.deepEqual(w[0].points.map((p) => p.temp), [-6, -5, -2]);
  assert.equal(w[0].average, 3.7);
});

test("bands: bounds are min-inclusive", () => {
  assert.equal(bandOf(-15).key, "c15");
  assert.equal(bandOf(-3).key, "c3");
  assert.equal(bandOf(0).key, "zero");
  assert.equal(bandOf(-30).key, "cold");
});

test("best wax per band, ties to the more-rated wax", () => {
  const best = bestByBand(history, "glide");
  const c8 = best.find((b) => b.band.key === "c8")!;
  assert.equal(c8.name, "Vauhti UP Polar"); // 5.0 from one session beats V20's 4.5
  const c3 = best.find((b) => b.band.key === "c3")!;
  assert.equal(c3.name, "Rex Blue");
  assert.equal(best.find((b) => b.band.key === "cold")!.name, null);
});

test("grip ratings only count for classic", () => {
  const grip = [
    { ...s("g", -5, null, []), technique: "classic" as const, grip_rating: 4, waxes: [{ zone: "grip" as const, name: "Rex Blue" }] },
    { ...s("h", -5, null, []), technique: "skate" as const, grip_rating: 4, waxes: [{ zone: "grip" as const, name: "Rex Blue" }] },
  ];
  assert.deepEqual(rated(grip, "grip").map((x) => x.id), ["g"]);
});

test("usage counts every session, rated or not", () => {
  assert.deepEqual(usage(history, "glide"), [
    { name: "Swix V20 Green", sessions: 3 },
    { name: "Rex Blue", sessions: 3 },
    { name: "Vauhti UP Polar", sessions: 1 },
  ].sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name)));
});

test("the temperature axis is padded and spans at least ten degrees", () => {
  const [lo, hi] = tempDomain(spreads(history, "glide"));
  assert.ok(lo <= -8 && hi >= 1);
  assert.ok(hi - lo >= 10);
  assert.deepEqual(tempDomain([]), [-20, 5]);
});
