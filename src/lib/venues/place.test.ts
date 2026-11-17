import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByPlace, placeOf } from "./place";

test("abbreviations and full names both read", () => {
  assert.deepEqual(placeOf("Canmore, AB"), { country: "Canada", province: "Alberta" });
  assert.deepEqual(placeOf("Kimberley, British Columbia, Canada"), { country: "Canada", province: "British Columbia" });
  assert.deepEqual(placeOf("Area C (Silver Star), British Columbia, Canada"), { country: "Canada", province: "British Columbia" });
  assert.deepEqual(placeOf("Alberta, Canada"), { country: "Canada", province: "Alberta" });
  assert.deepEqual(placeOf("Bozeman, MT"), { country: "United States", province: "Montana" });
});

test("other countries, and nothing at all", () => {
  assert.deepEqual(placeOf("Lillehammer, Innlandet, Norway"), { country: "Norway", province: null });
  assert.deepEqual(placeOf(null), { country: "Other places", province: null });
});

test("grouped by country, then province, then A–Z", () => {
  const g = groupByPlace([
    { name: "Mount Shark", region: "Kananaskis, AB" },
    { name: "Kimberley", region: "Kimberley, BC" },
    { name: "Canmore Nordic Centre", region: "Canmore, AB" },
    { name: "Somewhere", region: null },
    { name: "Birkie", region: "Cable, WI" },
  ]);
  assert.deepEqual(
    g.map((c) => [c.country, c.provinces.map((p) => [p.province, p.venues.map((v) => v.name)])]),
    [
      [
        "Canada",
        [
          ["Alberta", ["Canmore Nordic Centre", "Mount Shark"]],
          ["British Columbia", ["Kimberley"]],
        ],
      ],
      ["United States", [["Wisconsin", ["Birkie"]]]],
      ["Other places", [[null, ["Somewhere"]]]],
    ],
  );
});
