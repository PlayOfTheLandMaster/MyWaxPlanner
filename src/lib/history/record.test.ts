import { test } from "node:test";
import assert from "node:assert/strict";
import { similarSessions, type PastSession } from "./record";

const s = (id: string, snow: number | null, band: string | null, glide: number | null, day = "2026-01-01"): PastSession => ({
  id,
  occurred_at: `${day}T10:00:00Z`,
  venue_name: null,
  snow_temp_c: snow,
  snow_humidity_band: band,
  glide_rating: glide,
});

test("similar: within 3 °C and the same humidity, best glide first", () => {
  const past = [s("a", -5, "dry", 3), s("b", -7, "dry", 5), s("c", -12, "dry", 5), s("d", -6, "wet", 5), s("e", null, "dry", 5)];
  assert.deepEqual(
    similarSessions(past, { snow_temp_c: -6, snow_humidity_band: "dry" }).map((x) => x.id),
    ["b", "a"],
  );
});

test("similar: nothing without a forecast", () => {
  assert.deepEqual(similarSessions([s("a", -5, "dry", 3)], null), []);
});

test("similar: unrated sessions last, newest first among equals", () => {
  const past = [s("old", -5, "dry", null, "2025-01-01"), s("new", -5, "dry", null, "2026-01-01"), s("rated", -5, "dry", 2)];
  assert.deepEqual(
    similarSessions(past, { snow_temp_c: -5, snow_humidity_band: "dry" }).map((x) => x.id),
    ["rated", "new", "old"],
  );
});
