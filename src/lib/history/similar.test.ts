import { test } from "node:test";
import assert from "node:assert/strict";
import { similarQuery } from "./similar";

test("3 °C either side of today's snow, never above 0 °C, best glide first", () => {
  const q = new URLSearchParams(similarQuery({ snow_temp_c: -1.5, snow_humidity_band: "mid" }));
  assert.equal(q.get("tmin"), "-5");
  assert.equal(q.get("tmax"), "0");
  assert.equal(q.get("snowhum"), "mid");
  assert.equal(q.get("sort"), "glide");
  assert.equal(q.get("period"), "all");
});

test("very cold snow stops at −40 °C", () => {
  assert.equal(new URLSearchParams(similarQuery({ snow_temp_c: -39, snow_humidity_band: "dry" })).get("tmin"), "-40");
});
