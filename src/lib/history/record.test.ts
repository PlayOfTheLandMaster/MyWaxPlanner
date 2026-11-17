import { test } from "node:test";
import assert from "node:assert/strict";
import { draftFromWindow, similarSessions, type PastSession } from "./record";

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

test("Today's Snow Conditions replace the forecast's snow guesses, for the same venue and day only", () => {
  const w = {
    venue: { id: "v1" }, startIso: "2026-11-17T16:00:00Z", start: "2026-11-17T09:00", hours: [1, 2],
    air_temp_c: -3, air_temp_min_c: -4, air_temp_max_c: -2, overnight_low_c: -9, air_rh_pct: 60,
    snow_temp_c: -5, snow_humidity_band: "dry", snow_type: "fine_grained", new_snow_cm: 0, sky: "clear", wind_kmh: 5,
  } as unknown as Parameters<typeof draftFromWindow>[0];
  const check = { day: "2026-11-17", venue_id: "v1", snow_temp_c: -2, snow_humidity_band: "wet", snow_type: "transformed", track: "glazed", checked_at: "" } as const;
  const d = draftFromWindow(w, check);
  assert.equal(d.snow_temp_c, -2);
  assert.equal(d.snow_temp_estimated, false);
  assert.equal(d.snow_humidity_band, "wet");
  assert.equal(d.track, "glazed");
  assert.equal(draftFromWindow(w, { ...check, day: "2026-11-16" }).snow_temp_c, -5);
});
