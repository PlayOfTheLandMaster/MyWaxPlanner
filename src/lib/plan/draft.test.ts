import { test } from "node:test";
import assert from "node:assert/strict";
import { airHumidityBand, decodeDraft, encodeDraft, type DraftConditions } from "./draft";

const draft: DraftConditions = {
  venue_id: "0b8f1c1e-2a4b-4c55-9d1e-3f2a1b0c9d8e",
  observed_at: "2026-11-20T16:30:00.000Z",
  air_temp_c: -6,
  air_temp_min_c: -8,
  air_temp_max_c: -4,
  overnight_low_c: -14,
  snow_temp_c: -9.5,
  snow_temp_estimated: true,
  air_rh_pct: 72,
  snow_humidity_band: "dry",
  snow_type: "fine_grained",
  new_snow_cm: 2,
  sky: "overcast",
  wind_kmh: 10,
  track: "freshly_groomed",
  notes: "2026-11-20T09:30 local, 2 h",
};

test("a draft survives the trip through the address unchanged", () => {
  const encoded = encodeDraft(draft);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/); // safe in a URL without escaping
  assert.deepEqual(decodeDraft(encoded), draft);
});

test("a missing or damaged draft is refused", () => {
  assert.equal(decodeDraft(undefined), null);
  assert.equal(decodeDraft(""), null);
  assert.equal(decodeDraft("not-a-draft"), null);
});

test("an edited address cannot smuggle in bad values", () => {
  const bad = (patch: Record<string, unknown>) => decodeDraft(encodeDraft({ ...draft, ...patch } as DraftConditions));
  assert.equal(bad({ venue_id: "1; drop table" }), null);
  assert.equal(bad({ snow_temp_c: 3 }), null); // snow cannot be warmer than 0 °C
  assert.equal(bad({ air_rh_pct: 140 }), null);
  assert.equal(bad({ snow_type: "slush" }), null);
  assert.equal(bad({ observed_at: "yesterday-ish" }), null);
});

test("long notes are cut to the database's length", () => {
  assert.equal(decodeDraft(encodeDraft({ ...draft, notes: "x".repeat(500) }))?.notes?.length, 200);
});

test("air humidity bands follow the database's rule", () => {
  assert.equal(airHumidityBand(null), null);
  assert.equal(airHumidityBand(49), "dry");
  assert.equal(airHumidityBand(50), "mid");
  assert.equal(airHumidityBand(80), "mid");
  assert.equal(airHumidityBand(81), "wet");
});
